// app/api/run-pagespeed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const API_KEY = process.env.PAGESPEED_API_KEY;
const API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW = 100 * 1000; // 100 seconds
const RATE_LIMIT_MAX_REQUESTS = 400;
let requestTimestamps: number[] = [];

function isRateLimited(): boolean {
	const now = Date.now();
	requestTimestamps = requestTimestamps.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
	if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
		return true;
	}
	requestTimestamps.push(now);
	return false;
}

export async function POST(request: NextRequest) {
	const { url } = await request.json();

	if (!url) {
		return NextResponse.json({ message: 'URL is required' }, { status: 400 });
	}

	if (isRateLimited()) {
		return NextResponse.json({ message: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
	}

	try {
		const response = await fetch(`${API_URL}?url=${encodeURIComponent(url)}&key=${API_KEY}`, {
			next: { revalidate: 3600 } // Cache for 1 hour
		});
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error.message || 'Failed to fetch PageSpeed data');
		}

		const score = data.lighthouseResult.categories.performance.score * 100;

		// Store the result in the database
		const result = await prisma.testResult.create({
			data: {
				url: { connect: { address: url } },
				score: score,
				fullReport: JSON.stringify(data),
			},
		});

		return NextResponse.json({
			message: 'PageSpeed test completed successfully',
			score: score,
			resultId: result.id,
		});
	} catch (error) {
		console.error('Error running PageSpeed test:', error);
		return NextResponse.json({ message: 'Error running PageSpeed test', error: error.message }, { status: 500 });
	}
}

export const runtime = 'edge';
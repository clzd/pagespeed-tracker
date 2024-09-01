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
	console.log('Received request to run PageSpeed test');

	if (!API_KEY) {
		console.error('PAGESPEED_API_KEY is not set');
		return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
	}

	const { url } = await request.json();
	console.log(`Testing URL: ${url}`);

	if (!url) {
		console.error('URL is required but was not provided');
		return NextResponse.json({ message: 'URL is required' }, { status: 400 });
	}

	if (isRateLimited()) {
		console.warn('Rate limit exceeded');
		return NextResponse.json({ message: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
	}

	try {
		console.log('Fetching PageSpeed data...');
		const response = await fetch(`${API_URL}?url=${encodeURIComponent(url)}&key=${API_KEY}`);
		const data = await response.json();

		if (!response.ok) {
			console.error('Failed to fetch PageSpeed data:', data.error);
			throw new Error(data.error?.message || 'Failed to fetch PageSpeed data');
		}

		const score = data.lighthouseResult.categories.performance.score * 100;
		console.log(`PageSpeed score for ${url}: ${score}`);

		console.log('Storing result in database...');
		console.log('Prisma instance:', prisma);
		console.log('Prisma pageSpeedResult model:', prisma.pageSpeedResult);

		const result = await prisma.pageSpeedResult.create({
			data: {
				url: url,
				device: 'desktop', // You might want to make this dynamic
				performanceScore: score,
				fcp: data.lighthouseResult.audits['first-contentful-paint'].numericValue,
				lcp: data.lighthouseResult.audits['largest-contentful-paint'].numericValue,
				cls: data.lighthouseResult.audits['cumulative-layout-shift'].numericValue,
				tti: data.lighthouseResult.audits['interactive'].numericValue,
				tbt: data.lighthouseResult.audits['total-blocking-time'].numericValue,
			},
		});

		console.log(`Result stored with ID: ${result.id}`);

		return NextResponse.json({
			message: 'PageSpeed test completed successfully',
			score: score,
			resultId: result.id,
		});
	} catch (error) {
		console.error('Error running PageSpeed test:', error);
		return NextResponse.json({ message: 'Error running PageSpeed test', error: error.message }, { status: 500 });
	} finally {
		await prisma.$disconnect();
	}
}
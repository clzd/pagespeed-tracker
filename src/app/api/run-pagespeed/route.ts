import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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

function cleanUrl(url: string): string {
	return url.replace(/[\[\]]/g, '').trim();
}

async function runPageSpeedTest(url: string, device: 'mobile' | 'desktop') {
	const cleanedUrl = cleanUrl(url);
	console.log(`Running PageSpeed test for URL: ${cleanedUrl} on ${device}`);
	const response = await fetch(`${API_URL}?url=${encodeURIComponent(cleanedUrl)}&key=${API_KEY}&strategy=${device}&category=performance&category=accessibility&category=best-practices&category=seo&category=pwa`);
	const data = await response.json();

	if (!response.ok) {
		console.error('PageSpeed API Error:', data.error);
		throw new Error(data.error?.message || 'Failed to fetch PageSpeed data');
	}

	console.log('PageSpeed API Response:', JSON.stringify(data, null, 2));

	const { lighthouseResult } = data;

	if (!lighthouseResult || !lighthouseResult.categories) {
		throw new Error('Invalid PageSpeed API response structure');
	}

	const getScore = (category: string) => {
		return lighthouseResult.categories[category]?.score * 100 || 0;
	};

	const getAuditValue = (auditName: string) => {
		return lighthouseResult.audits[auditName]?.numericValue || 0;
	};

	return {
		url: cleanedUrl,
		device,
		performanceScore: getScore('performance'),
		accessibilityScore: getScore('accessibility'),
		bestPracticesScore: getScore('best-practices'),
		seoScore: getScore('seo'),
		pwaScore: getScore('pwa'),
		fcp: getAuditValue('first-contentful-paint'),
		lcp: getAuditValue('largest-contentful-paint'),
		cls: getAuditValue('cumulative-layout-shift'),
		tti: getAuditValue('interactive'),
		tbt: getAuditValue('total-blocking-time'),
		speedIndex: getAuditValue('speed-index'),
	};
}

export async function POST(request: NextRequest) {
	console.log('Received request to run PageSpeed tests');

	if (!API_KEY) {
		console.error('PAGESPEED_API_KEY is not set');
		return NextResponse.json({ message: 'Server configuration error' }, { status: 500 });
	}

	const body = await request.json();
	console.log('Received body:', body);

	if (typeof body.urls !== 'string') {
		return NextResponse.json({ message: 'Invalid input: URLs must be a comma-separated string' }, { status: 400 });
	}

	const urls = body.urls.split(',').map(url => url.trim()).filter(url => url !== '');

	if (urls.length === 0) {
		return NextResponse.json({ message: 'No valid URLs provided' }, { status: 400 });
	}

	if (urls.length > 30) {
		return NextResponse.json({ message: 'Too many URLs. Maximum allowed is 30.' }, { status: 400 });
	}

	if (isRateLimited()) {
		return NextResponse.json({ message: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
	}

	try {
		const results = [];

		for (const url of urls) {
			for (const device of ['mobile', 'desktop'] as const) {
				console.log(`Testing URL: ${url} on ${device}`);
				const testResult = await runPageSpeedTest(url, device);

				const result = await prisma.pageSpeedResult.create({
					data: testResult,
				});

				results.push({
					url: result.url,
					device: result.device,
					performanceScore: result.performanceScore,
					accessibilityScore: result.accessibilityScore,
					bestPracticesScore: result.bestPracticesScore,
					seoScore: result.seoScore,
					pwaScore: result.pwaScore,
					resultId: result.id,
				});
			}
		}

		return NextResponse.json({
			message: 'PageSpeed tests completed successfully',
			results,
		});
	} catch (error) {
		console.error('Error running PageSpeed tests:', error);
		return NextResponse.json({ message: 'Error running PageSpeed tests', error: error.message }, { status: 500 });
	}
}
'use client';

import React, { useState } from 'react';

export default function TestPageSpeed() {
	const [urls, setUrls] = useState('');
	const [results, setResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const runTest = async (e) => {
		e.preventDefault();
		setLoading(true);
		setError('');
		setResults([]);

		try {
			const response = await fetch('/api/run-pagespeed', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ urls }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'An error occurred');
			}

			setResults(data.results);
		} catch (error) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="p-4">
			<h1 className="text-2xl font-bold mb-4">PageSpeed Test</h1>
			<form onSubmit={runTest} className="mb-4">
				<input
					type="text"
					value={urls}
					onChange={(e) => setUrls(e.target.value)}
					placeholder="Enter URL(s) separated by commas"
					className="w-full p-2 border rounded"
				/>
				<button
					type="submit"
					disabled={loading}
					className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
				>
					{loading ? 'Running...' : 'Run Test'}
				</button>
			</form>

			{error && <p className="text-red-500">{error}</p>}

			{results.length > 0 && (
				<div>
					<h2 className="text-xl font-semibold mb-2">Results:</h2>
					{results.map((result, index) => (
						<div key={index} className="mb-4 p-4 border rounded">
							<p><strong>URL:</strong> {result.url}</p>
							<p><strong>Device:</strong> {result.device}</p>
							<p><strong>Performance Score:</strong> {result.performanceScore.toFixed(2)}</p>
							<p><strong>Accessibility Score:</strong> {result.accessibilityScore.toFixed(2)}</p>
							<p><strong>Best Practices Score:</strong> {result.bestPracticesScore.toFixed(2)}</p>
							<p><strong>SEO Score:</strong> {result.seoScore.toFixed(2)}</p>
							<p><strong>PWA Score:</strong> {result.pwaScore.toFixed(2)}</p>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
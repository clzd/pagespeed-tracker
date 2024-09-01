// app/test-pagespeed/page.tsx
'use client';

import React, { useState } from 'react';

export default function TestPageSpeed() {
	const [url, setUrl] = useState('');
	const [result, setResult] = useState('');

	const runTest = async () => {
		setResult('Running test...');

		try {
			const response = await fetch('/api/run-pagespeed', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ url }),
			});

			const data = await response.json();

			if (response.ok) {
				setResult(`Test completed successfully.\nScore: ${data.score}\nResult ID: ${data.resultId}`);
			} else {
				setResult(`Error: ${data.message}`);
			}
		} catch (error) {
			setResult(`Error: ${error.message}`);
		}
	};

	return (
		<div>
			<h1>PageSpeed API Test</h1>
			<input
				type="text"
				value={url}
				onChange={(e) => setUrl(e.target.value)}
				placeholder="Enter URL to test"
			/>
			<button onClick={runTest}>Run Test</button>
			<pre>{result}</pre>
		</div>
	);
}
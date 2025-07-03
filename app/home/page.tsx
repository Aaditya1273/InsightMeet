// app/home/page.tsx

import React from 'react';
import Link from 'next/link';

const HomePage = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          Welcome to InsightMeet
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300">
          Transform your meeting recordings into actionable insights. Upload, transcribe, and get summaries in seconds.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/upload-demo"
            className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Get Started
          </Link>
          <Link href="/demo-preview" className="text-sm font-semibold leading-6 text-gray-900 dark:text-white">
            Live demo <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
};

export default HomePage;
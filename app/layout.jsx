import './globals.css';

export const metadata = {
  title: 'InsightMeet - AI-Powered Meeting Insights',
  description: 'Transform your meetings into actionable insights with AI-powered analytics and real-time collaboration tools',
  keywords: 'AI meetings, insights, analytics, collaboration, productivity',
  authors: [{ name: 'InsightMeet Team' }],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#667eea' },
    { media: '(prefers-color-scheme: dark)', color: '#764ba2' }
  ],
  openGraph: {
    title: 'InsightMeet - AI-Powered Meeting Insights',
    description: 'Transform your meetings into actionable insights with AI',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" 
          rel="stylesheet" 
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Instant dark mode detection
              (function() {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', theme === 'dark');
              })();
              
              // Magnetic cursor effect
              document.addEventListener('DOMContentLoaded', function() {
                const magneticElements = document.querySelectorAll('.magnetic');
                
                magneticElements.forEach(el => {
                  el.addEventListener('mousemove', function(e) {
                    const rect = el.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    
                    el.style.transform = \`translate(\${x * 0.1}px, \${y * 0.1}px)\`;
                  });
                  
                  el.addEventListener('mouseleave', function() {
                    el.style.transform = 'translate(0, 0)';
                  });
                });
                
                // Scroll reveal animation
                const revealElements = document.querySelectorAll('.reveal');
                const revealObserver = new IntersectionObserver((entries) => {
                  entries.forEach(entry => {
                    if (entry.isIntersecting) {
                      entry.target.classList.add('active');
                    }
                  });
                }, { threshold: 0.1 });
                
                revealElements.forEach(el => revealObserver.observe(el));
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen overflow-x-hidden">
        {/* Animated Background */}
        <div className="fixed inset-0 -z-10">
          {/* Primary gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-blue-900 dark:to-purple-900"></div>
          
          {/* Floating orbs */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-bounce-subtle"></div>
          <div className="absolute top-40 right-10 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-spin-slow"></div>
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23667eea" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        </div>

        {/* Futuristic Header */}
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
          <nav className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-3 magnetic">
                <div className="w-10 h-10 bg-gradient-cosmic rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gradient">InsightMeet</h1>
              </div>

              {/* Navigation */}
              <div className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-slate-600 hover:text-neon-blue transition-colors duration-300">Features</a>
                <a href="#pricing" className="text-slate-600 hover:text-neon-blue transition-colors duration-300">Pricing</a>
                <a href="#about" className="text-slate-600 hover:text-neon-blue transition-colors duration-300">About</a>
                <button className="btn btn-secondary magnetic">Sign In</button>
                <button className="btn btn-primary magnetic">Get Started</button>
              </div>

              {/* Mobile menu button */}
              <button className="md:hidden btn btn-secondary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </nav>
        </header>

        {/* Main Content Area */}
        <main className="relative pt-20">
          <div className="container mx-auto px-6 py-12">
            {/* Hero Section */}
            <section className="text-center mb-20 reveal">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-5xl md:text-7xl font-bold mb-6 text-gradient leading-tight">
                  Transform Meetings
                  <br />
                  <span className="text-neon">Into Insights</span>
                </h2>
                <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
                  Harness the power of AI to turn every conversation into actionable intelligence
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="btn btn-primary btn-lg magnetic">
                    Start Free Trial
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                  <button className="btn btn-neon btn-lg magnetic">
                    Watch Demo
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </section>

            {/* Stats Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 reveal">
              <div className="card card-floating text-center">
                <div className="text-4xl font-bold text-neon-blue mb-2">10M+</div>
                <div className="text-slate-600 dark:text-slate-300">Meetings Analyzed</div>
              </div>
              <div className="card card-holographic text-center">
                <div className="text-4xl font-bold text-neon-purple mb-2">98%</div>
                <div className="text-slate-600 dark:text-slate-300">Accuracy Rate</div>
              </div>
              <div className="card card-neon text-center">
                <div className="text-4xl font-bold text-neon-green mb-2">50%</div>
                <div className="text-slate-600 dark:text-slate-300">Time Saved</div>
              </div>
            </section>

            {/* Main Content */}
            <div className="reveal">
              {children}
            </div>
          </div>
        </main>

        {/* Floating Action Button */}
        <button className="fixed bottom-8 right-8 w-16 h-16 btn btn-floating rounded-full shadow-2xl z-40 magnetic">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Footer */}
        <footer className="glass border-t border-white/20 mt-20">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4 magnetic">
                  <div className="w-8 h-8 bg-gradient-cosmic rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="font-bold text-gradient">InsightMeet</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  Transforming the future of meetings with AI-powered insights.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 text-slate-800 dark:text-white">Product</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li><a href="#" className="hover:text-neon-blue transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-neon-blue transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-neon-blue transition-colors">API</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 text-slate-800 dark:text-white">Company</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li><a href="#" className="hover:text-neon-blue transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-neon-blue transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-neon-blue transition-colors">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-4 text-slate-800 dark:text-white">Connect</h3>
                <div className="flex space-x-3">
                  <button className="w-10 h-10 btn btn-secondary rounded-full magnetic">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                    </svg>
                  </button>
                  <button className="w-10 h-10 btn btn-secondary rounded-full magnetic">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                    </svg>
                  </button>
                  <button className="w-10 h-10 btn btn-secondary rounded-full magnetic">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/20 mt-8 pt-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                © 2025 InsightMeet. All rights reserved. Built with cutting-edge technology.
              </p>
            </div>
          </div>
        </footer>

        {/* Cursor Trail Effect */}
        <div id="cursor-trail" className="fixed pointer-events-none z-50 w-4 h-4 bg-gradient-cosmic rounded-full blur-sm opacity-0 transition-opacity duration-300"></div>
      </body>
    </html>
  );
}
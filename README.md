# InsightMeet

InsightMeet is an AI-powered meeting assistant that helps you transcribe, summarize, and extract action items from your meetings. It's built with Next.js and uses local AI models for processing.

## Features

- 📝 Upload meeting audio or text transcripts
- 🎙️ Automatic speech-to-text transcription
- ✨ AI-powered meeting summarization
- ✅ Action item extraction
- 📧 Generate follow-up emails
- 📄 Export to PDF
- 📅 Add to calendar (ICS format)
- 🔒 Privacy-focused (all processing happens locally)

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/insightmeet.git
   cd insightmeet
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env.local` file in the root directory and add your Hugging Face API token (optional for local models):
   ```
   HUGGINGFACE_API_KEY=your_api_key_here
   ```

4. Create the required directories:
   ```bash
   mkdir -p uploads exports
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Upload a Meeting**:
   - Select whether you're uploading an audio file or a text transcript
   - Click "Choose File" to select your file
   - Click "Generate Insights" to process the meeting

2. **Review Insights**:
   - View the meeting summary and key points
   - Check the extracted action items
   - Review the suggested follow-up email

3. **Export Options**:
   - Download a PDF summary
   - Send the follow-up email
   - Add the meeting to your calendar
   - Export in various formats (Markdown, Text)

## Local AI Processing

By default, InsightMeet uses mock data for demonstration. To enable local AI processing:

1. Install required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the local AI server:
   ```bash
   python server.py
   ```

3. Update the API endpoints in the application to point to your local server.

## Deployment

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Finsightmeet)

1. Fork this repository
2. Create a new Vercel project
3. Import your forked repository
4. Add environment variables in the Vercel dashboard
5. Deploy!

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HUGGINGFACE_API_KEY` | Your Hugging Face API key (optional) | - |
| `NEXT_PUBLIC_API_URL` | Base URL for the API (for local development) | `/api` |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Hugging Face](https://huggingface.co/)
- [PDFKit](https://pdfkit.org/)
- [ICS](https://www.npmjs.com/package/ics)

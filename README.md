# Assistant Pro

A professional conversational AI agent designed to serve as a personal assistant and portfolio showcase platform. This intelligent agent can interact through both text and audio messages, providing comprehensive information about professional experience, curriculum, projects, and managing consultation appointments.

## Features

- 💬 Text-based conversation
- 🎤 Audio message support
- 📋 Professional information sharing:
  - Work experience
  - Curriculum vitae
  - Project portfolio
  - Professional achievements
- 📅 Consultation appointment booking
- 🤖 Powered by OpenAI's advanced language models

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Protospi/assistant-pro.git
cd assistant-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Create a `.env` file in the root directory
- Add your OpenAI API key (see `.env.example` below)

4. Start the development server:
```bash
npm run dev
```

## Environment Setup

Create a `.env` file in the root directory with the following content:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Replace `your_openai_api_key_here` with your actual OpenAI API key. You can obtain an API key from [OpenAI's platform](https://platform.openai.com/).

## Usage

The application will be available at `http://localhost:3000` after starting the development server. Users can:
- Engage in text conversations
- Send audio messages
- Request professional information
- Schedule consultation appointments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
StudySync AI 🧠📚StudySync AI is an intelligent React application that leverages the Gemini API to help students study smarter. It features automated syllabus breakdown, instant study notes generation, custom practice questions, and Previous Year Question (PYQ) analysis to identify highly probable exam topics.🚀 FeaturesSyllabus Master: Paste your syllabus to get a structured JSON breakdown of topics and subtopics.AI Notes Generation: One-click generation of comprehensive, well-formatted study notes.Smart Question Generator: Automatically creates Very Short, Short, Long, and Essay type questions targeting different cognitive levels.PYQ Analyzer: Paste past exam questions to discover recurring themes, prioritize topics based on repetition, and predict future exam questions.🛠️ Tech StackFrontend: React (Vite)Styling: Tailwind CSSIcons: Lucide ReactAI Integration: Google Gemini API (gemini-3-flash-preview)💻 Local Setup & InstallationFollow these steps to run the project locally on your machine.1. Scaffold the ProjectOpen your terminal and create a new Vite project:npm create vite@latest studysync-ai -- --template react
cd studysync-ai
npm install

2. Install DependenciesInstall Tailwind CSS and Lucide React (for the icons used in the app):# Install Lucide icons
npm install lucide-react

# Install Tailwind CSS and its peers
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

3. Configure TailwindOpen tailwind.config.js and update the content array:export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

Replace the contents of src/index.css with the Tailwind directives:@tailwind base;
@tailwind components;
@tailwind utilities;

4. Add the Application CodeReplace the entire contents of src/App.jsx with the code provided in this repository.5. Environment Variables (API Key)Important: Never hardcode your API key or commit it to GitHub.Create a .env file in the root of your project (same folder as package.json) and add your Gemini API key:VITE_GEMINI_API_KEY=your_actual_api_key_here

(Ensure .env is listed in your .gitignore file).Update line 12 in src/App.jsx to use the environment variable:const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

6. Run the AppStart the development server:npm run dev

🤝 ContributingContributions, issues and feature requests are welcome! Feel free to check issues page.📝 LicenseThis project is open source and available under the MIT License.

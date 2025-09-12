**IMPORTANT**
# Documentation App

## 📖 Overview
The **Report App** is a React-based application designed to create, edit, and manage production testing forms.  
It supports saving forms as PDFs and resuming work by reloading a previously saved PDF.  

Key features:
- Dynamic form fields with add/remove row options.
- Dropdown menus (no free typing for controlled inputs).
- Ability to save and print forms directly to PDF.
- Resume from PDF: upload a saved PDF to continue editing.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- npm (comes with Node.js)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Vien-Trieu/documentation.git
   ```
2. Navigate into the project folder:
```
cd documentation/report-app
```
3. Install dependencies:
   ```
   npm install
   ```
### Running the App
	Start the development server:
		```npm run dev
		```
	Open your browser at **[http://localhost:5173](http://localhost:5173)** (or the port shown in your terminal).
## 🛠️ Usage

1. Fill out the production testing form.
    
2. Add or remove rows as needed.
    
3. Save or print to PDF using **Ctrl+P / Cmd+P**.
    
4. To resume, upload the PDF back into the app.


## 📂 Project Structure
	report-app/
	├── public/          # Static assets
	├── src/             # Source code
	│   ├── App.tsx      # Main application component
	│   ├── components/  # Reusable components
	│   └── styles/      # CSS styles
	├── package.json     # Project dependencies
	└── README.md        # Project documentation

## ## ⚙️ Technologies Used

- **React** (Vite for fast development)
    
- **TypeScript**
    
- **PDF.js** for PDF loading and parsing
    
- **CSS** for styling

---

## 🤝 Contributing
This project is not open for contributions.  
It is maintained as a private project and published here only for demonstration purposes.

---

## 📌 Note
This software is **private** and intended solely for portfolio and resume review.  
It is not licensed for public use, distribution, or modification.

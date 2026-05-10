# PrismShot 🌈🚀

> An immersive, gesture-controlled arcade experience powered by Computer Vision and Generative AI, now with classic touch controls and internationalization!

![License](https://img.shields.io/badge/license-Apache_2.0-blue.svg)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Computer_Vision-orange)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI-8E75B2)

## 📋 Overview

**PrismShot** is a next-generation web game that transforms your webcam into a game controller. Using **MediaPipe** for real-time hand tracking, players can physically pinch and pull a virtual cannon to launch bubbles. The application leverages **Google's Gemini 3 Flash** model to analyze the game board and provide strategic aim assistance.

Developed with a focus on performance and aesthetics, the game features a polished UI, particle effects, multiple visual themes, and a responsive design suitable for both desktop and mobile devices.

---

## ✨ Key Features

### 🎮 Gameplay Mechanics
- **Dual Play Modes**:
  - **AI Mode (Webcam)**: Control the cannon entirely with hand movements using your webcam. (Pinch to charge, Drag to aim, Release to fire).
  - **Manual Mode (Touch/Mouse)**: Classic gameplay style with smooth, optimized touch/mouse aiming and shooting.
- **Dynamic Physics**: Realistic projectile trajectory, collision detection, and bubble clustering.
- **Power-ups**:
  - 💣 **Bomb**: Explodes surrounding bubbles.
  - ❄️ **Freeze**: Stops the board from descending for a limited time.
  - 🌈 **Wildcard**: Matches with any color.

### 🎨 Customization & Progression
- **Visual Themes**: Choose from 6 distinct cannon designs, including Classic, Neon, Cyber, Gold, Wood, and the high-tech **Prism** style.
- **Difficulty Modes**:
  - **Easy**: Casual play with 5 colors and no auto-descent.
  - **Medium**: Balanced challenge with 6 colors.
  - **Hard**: Fast-paced action for skilled players.
- **Dynamic Scoring**: Material Design color-coded scoring system with combo multipliers.
- **Stunning Visuals**: Neon glow effects for hand skeletons, prism traces indicating pinch gestures, and particle effects for a deeply visually satisfying experience.

### 🌐 Internationalization (i18n)
- **Auto-Translation**: Identifies the device language automatically and translates the UI into English, Portuguese, or Spanish.

### 🤖 AI Integration
- **Strategic Copilot**: Uses Google Gemini 3 Flash to analyze the board state visually and suggest optimal shots based on cluster value and danger levels.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Computer Vision**: Google MediaPipe Hands
- **Generative AI**: Google GenAI SDK (`@google/genai`)
- **Icons**: Lucide React
- **Monetization**: Google AdSense Ready

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A valid Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/prismshot.git
   cd prismshot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory and add your API key:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

---

## 🕹️ How to Play

**AI Mode:**
1. **Allow Camera Access**: The game requires webcam access to track your hand.
2. **Calibrate**: Stand back slightly so your hand is clearly visible.
3. **Aim & Shoot**:
   - Raise your hand.
   - Touch your **Index Finger** to your **Thumb** to "pinch" and charge the cannon.
   - Move your hand to aim.
   - Separate your fingers to fire the shot.

**Manual Mode:**
1. Tap/click and drag around the screen to target the cannon.
2. Release your finger/click to fire!

**Objective**: Match 3 or more bubbles of the same color to clear them. Don't let the bubbles reach the bottom line!

---

## 👨‍💻 Developer

**Developed by Eleandro**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/eleandro-mangrich)

---

*Note: This project uses experimental AI features. Performance may vary based on network latency and device capabilities.*

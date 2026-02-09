# Gemini Slingshot 🎯

> An immersive, gesture-controlled arcade experience powered by Computer Vision and Generative AI.

![License](https://img.shields.io/badge/license-Apache_2.0-blue.svg)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)
![MediaPipe](https://img.shields.io/badge/MediaPipe-Computer_Vision-orange)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI-8E75B2)

## 📋 Overview

**Gemini Slingshot** is a next-generation web game that transforms your webcam into a game controller. Using **MediaPipe** for real-time hand tracking, players can physically pinch and pull a virtual slingshot to launch bubbles. The application leverages **Google's Gemini 3 Flash** model to analyze the game board and provide strategic aim assistance.

Developed with a focus on performance and aesthetics, the game features a polished UI, particle effects, multiple visual themes, and a responsive design suitable for both desktop and mobile devices.

## ✨ Key Features

### 🎮 Gameplay Mechanics
- **Gesture Control**: Control the slingshot entirely with hand movements using your webcam.
  - **Pinch**: Grab the projectile.
  - **Drag**: Pull back to aim and power up.
  - **Release**: Open your fingers to shoot.
- **Dynamic Physics**: Realistic projectile trajectory, collision detection, and bubble clustering.
- **Power-ups**:
  - 💣 **Bomb**: Explodes surrounding bubbles.
  - ❄️ **Freeze**: Stops the board from descending for a limited time.
  - 🌈 **Wildcard**: Matches with any color.

### 🎨 Customization & Progression
- **Visual Themes**: Choose from 6 distinct slingshot designs, including Classic, Neon, Cyber, Gold, Wood, and the exclusive **Hook** style.
- **Difficulty Modes**:
  - **Easy**: Casual play with no auto-descent.
  - **Medium**: Balanced challenge.
  - **Hard**: Fast-paced action for skilled players.
- **Dynamic Scoring**: Material Design color-coded scoring system with combo multipliers.

### 🤖 AI Integration
- **Strategic Copilot**: Uses Google Gemini 3 Flash to analyze the board state visually and suggest optimal shots based on cluster value and danger levels.

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Computer Vision**: Google MediaPipe Hands
- **Generative AI**: Google GenAI SDK (`@google/genai`)
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- A valid Google Gemini API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gemini-slingshot.git
   cd gemini-slingshot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory and add your API key:
   ```env
   API_KEY=your_google_gemini_api_key_here
   ```

4. **Run the application**
   ```bash
   npm start
   ```
   Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## 🕹️ How to Play

1. **Allow Camera Access**: The game requires webcam access to track your hand.
2. **Calibrate**: Stand back slightly so your hand is clearly visible.
3. **Aim & Shoot**:
   - Raise your hand.
   - Touch your **Index Finger** to your **Thumb** to "pinch" the ball.
   - Move your hand to aim.
   - Separate your fingers to release the shot.
4. **Objective**: Match 3 or more bubbles of the same color to clear them. Don't let the bubbles reach the bottom line!

## 👨‍💻 Developer

**Developed by Eleandro**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?style=flat&logo=linkedin)](https://www.linkedin.com/in/eleandro-mangrich)

---

*Note: This project uses experimental AI features. Performance may vary based on network latency and device capabilities.*

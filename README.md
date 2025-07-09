# OpenCalendar

A decentralized calendar application built on the Internet Computer Protocol (ICP) that provides users with secure, private, and interoperable event management capabilities.

## 📚 Table of Contents

- [🌟 What is OpenCalendar?](#-what-is-opencalendar)
- [🚀 Why ICP for Calendar Applications?](#-why-icp-for-calendar-applications)
- [📋 Features](#-features)
- [🛠️ Technology Stack](#️-technology-stack)
- [🏗️ Architecture Overview](#️-architecture-overview)
- [🚀 Getting Started](#-getting-started)
- [📖 Usage](#-usage)
- [🔧 Development](#-development)
- [🚀 Deployment](#-deployment-1)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🔗 Resources](#-resources)
- [📞 Support](#-support)

## 🌟 What is OpenCalendar?

OpenCalendar is a modern, full-featured calendar application that leverages the power of the Internet Computer blockchain to offer:

- **Decentralized Storage**: Your calendar data is stored on the Internet Computer, ensuring high availability and resistance to censorship
- **Privacy-First**: No centralized servers collecting your personal data - you own and control your calendar information
- **Internet Identity Integration**: Secure authentication using ICP's Internet Identity system
- **Cross-Platform Access**: Access your calendar from any device with a web browser
- **Real-Time Synchronization**: Changes are instantly reflected across all your devices
- **Offline Resilience**: Built-in caching ensures the app works even with poor connectivity

## 🚀 Why ICP for Calendar Applications?

The Internet Computer Protocol provides unique advantages for calendar applications:

### **True Ownership**

- Your calendar data is stored in canisters you control
- No risk of service shutdown or data loss from centralized providers
- Full data portability and export capabilities

### **Enhanced Privacy**

- No third-party tracking or advertising
- End-to-end encryption for sensitive calendar data
- Compliance with privacy regulations by design

### **Cost Efficiency**

- Minimal hosting costs through ICP's reverse gas model
- No monthly subscription fees for users
- Sustainable economics for developers

### **Interoperability**

- Standard calendar formats (iCal, CalDAV) for easy integration
- API access for third-party applications
- Cross-platform compatibility

### **Reliability**

- Distributed infrastructure with 99.9% uptime
- Automatic backups and disaster recovery
- No single points of failure

## 📋 Features

- **📅 Multiple Calendar Views**: Month, day, and year views with smooth navigation
- **📝 Event Management**: Create, edit, and delete events with rich metadata
- **🔔 Notifications**: Built-in notification system for upcoming events
- **🎨 Customizable UI**: Dark/light themes and personalized settings
- **📱 Responsive Design**: Works seamlessly on desktop and mobile devices
- **🔐 Secure Authentication**: Internet Identity integration for passwordless login
- **⚡ Fast Performance**: Optimized for quick loading and smooth interactions
- **💾 Offline Support**: Local caching for use without internet connection

## 🛠️ Technology Stack

### Frontend

- **Framework**: SvelteKit 2.0 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **UI Components**: Lucide icons and custom Svelte components
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: Svelte stores with persistent localStorage

### Backend

- **Runtime**: Internet Computer canisters
- **Language**: Motoko for smart contract development
- **Architecture**: Microservices with specialized canisters:
  - `calendar_canister_1`: Event and calendar management
  - `user_registry`: User profile and authentication
  - `scheduling_canister`: Event scheduling and conflicts
  - `notification_canister`: Event notifications and reminders
- **Storage**: Stable memory for data persistence
- **Authentication**: Internet Identity integration

## 🏗️ Architecture Overview

OpenCalendar follows a microservices architecture with clear separation of concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  User Registry  │    │   Calendar      │
│   (SvelteKit)   │◄──►│   Canister      │◄──►│   Canister      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐    ┌─────────────────┐
         └─────────────►│   Scheduling    │    │ Notification    │
                        │   Canister      │◄──►│   Canister      │
                        │                 │    │                 │
                        └─────────────────┘    └─────────────────┘
```

### Canister Responsibilities

- **User Registry**: Manages user profiles, authentication, and calendar ownership
- **Calendar Canister**: Handles event CRUD operations, calendar management, and data queries
- **Scheduling Canister**: Manages event scheduling, conflict detection, and availability
- **Notification Canister**: Handles event reminders and notification delivery
- **Frontend**: Serves the web application and manages user interactions

## 🚀 Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- npm 7.0.0 or higher
- DFX (Internet Computer SDK) 0.27.0 or higher

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/icp-calendar.git
   cd icp-calendar
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Start the local ICP replica**

   ```bash
   dfx start --background
   ```

4. **Deploy the canisters**

   ```bash
   dfx deploy
   ```

5. **Start the frontend development server**

   ```bash
   npm start
   ```

6. **Open your browser**
   Navigate to `http://localhost:8080` to access the application

### Configuration

The application uses several configuration files:

- `dfx.json`: ICP canister configuration
- `src/frontend/vite.config.ts`: Frontend build configuration
- `src/frontend/tailwind.config.cjs`: Styling configuration

## 📖 Usage

### Authentication

1. Click "Sign In" to access Internet Identity
2. Follow the prompts to create or use an existing identity
3. Grant calendar access permissions

### Creating Events

1. Click on any date or use the "+" button
2. Fill in event details (title, description, time, etc.)
3. Save the event to add it to your calendar

### Managing Calendars

1. Use the sidebar to create new calendars
2. Toggle calendar visibility
3. Customize calendar colors and settings

### Settings

1. Access settings via the gear icon in the header
2. Customize themes, notifications, and display preferences
3. Manage your profile and privacy settings

## 🔧 Development

### Project Structure

```
icp-calendar/
├── src/
│   ├── backend/           # Motoko canisters
│   │   ├── calendar/      # Calendar management
│   │   ├── user_registry/ # User profiles
│   │   ├── scheduling/    # Event scheduling
│   │   └── notification/  # Notifications
│   └── frontend/          # SvelteKit application
│       ├── src/
│       │   ├── lib/       # Shared components and utilities
│       │   ├── routes/    # Application pages
│       │   └── stores/    # State management
│       └── static/        # Static assets
├── dfx.json              # ICP configuration
└── package.json          # Project dependencies
```

### Development Commands

```bash
# Start local development
dfx start --background
dfx deploy
npm start

# Build for production
npm run build

# Run tests
npm test

# Format code
npm run format

# Lint code
npm run lint
```

### Adding New Features

1. **Frontend**: Add components in `src/frontend/src/lib/components/`
2. **Backend**: Modify Motoko files in `src/backend/`
3. **Stores**: Update state management in `src/frontend/src/lib/stores/`
4. **Routes**: Add new pages in `src/frontend/src/routes/`

## 🚀 Deployment

### Local Deployment

```bash
dfx deploy --network local
```

### IC Mainnet Deployment

```bash
dfx deploy --network ic
```

### Environment Variables

The application automatically configures itself based on the deployment environment. No manual environment variable configuration is required.

## 🤝 Contributing

We welcome contributions from the community! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Code style and standards
- Development workflow
- Testing requirements
- Pull request process

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Resources

- [Internet Computer Documentation](https://internetcomputer.org/docs)
- [Motoko Programming Language](https://internetcomputer.org/docs/current/motoko/main/motoko)
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📞 Support

For questions, issues, or contributions:

- Create an issue on GitHub
- Join our community Discord
- Check the documentation wiki

---

**OpenCalendar** - Decentralized calendar management for the modern web, powered by the Internet Computer Protocol.

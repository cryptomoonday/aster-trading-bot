# Aster Trading Bot

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Aster Trading Bot** that implements the TradingView "Watermellon" strategy (EMA 8/21/48 + RSI14) and Peach Hybrid strategy for **AsterDEX cryptocurrency exchange**. Built with Next.js and TypeScript for high-performance algorithmic trading with real-time market data processing.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Trading Strategies](#trading-strategies)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Risk Management](#risk-management)
- [FAQ](#faq)
- [Contributing](#contributing)
- [Keywords](#keywords)
- [Contact](#contact)
- [Donation](#donation)

## Overview

**Aster Trading Bot** is an advanced **automated cryptocurrency trading bot** designed for the **AsterDEX exchange**. It recreates the popular TradingView "Watermellon" script using a sophisticated combination of **Exponential Moving Averages (EMA)** and **Relative Strength Index (RSI)** indicators. The bot processes real-time market data through WebSocket connections, builds synthetic 30-second bars from raw ticks, and executes trades based on technical analysis signals.

### What Makes This Bot Special?

- **Real-time Market Data Processing**: Direct WebSocket integration with AsterDEX for low-latency trading
- **Multiple Trading Strategies**: Supports both Watermellon and Peach Hybrid strategies
- **Risk Management**: Built-in position sizing, leverage limits, and stop-loss protection
- **Dry-Run Mode**: Test strategies safely before live trading
- **Modern Tech Stack**: Next.js dashboard + TypeScript for reliability and maintainability
- **Synthetic Bar Building**: Converts raw ticks into OHLCV bars for indicator calculations

## Features

### Core Capabilities

- **Automated Trading**: Fully automated execution of trading strategies on AsterDEX
- **Dual Strategy Support**: 
  - **Watermellon Strategy**: EMA 8/21/48 stack with RSI(14) filters
  - **Peach Hybrid Strategy**: Advanced trend and momentum-based system
- **Real-time Indicators**: 
  - Exponential Moving Averages (EMA) with configurable periods
  - Relative Strength Index (RSI) for momentum analysis
  - ADX (Average Directional Index) for trend strength
- **Risk Management**:
  - Maximum position size limits
  - Leverage controls (up to 1000x for premium)
  - Stop-loss and take-profit orders
  - Flip rate limiting to prevent overtrading
  - Emergency stop-loss protection
- **Execution Modes**:
  - **Dry-run mode**: Simulate trades without real money
  - **Live mode**: Execute real trades on AsterDEX
- **State Persistence**: Bot state survives restarts
- **Web Dashboard**: Next.js-based monitoring interface
- **Order Tracking**: Real-time order status monitoring

### Technical Features

- **Synthetic Bar Building**: Converts tick data into configurable timeframe bars
- **Event Deduplication**: Prevents duplicate signal processing
- **Structured Logging**: JSON logs for analysis and debugging
- **Type-Safe Configuration**: Zod schema validation for environment variables
- **WebSocket Reconnection**: Automatic reconnection handling
- **Position State Management**: Tracks open positions and trade history

## Trading Strategies

### Watermellon Strategy

The **Watermellon strategy** uses a triple EMA stack combined with RSI filters:

- **EMA Stack**: Fast (8), Mid (21), and Slow (48) period EMAs
- **Trend Gate**: Fast > Mid > Slow for long positions, inverse for shorts
- **RSI Filter**: RSI(14) > 42 for long signals, < 58 for short signals
- **Signal Logic**: Triggers only on rising edges to avoid duplicate entries

**Default Parameters:**
- EMA Fast: 8 periods
- EMA Mid: 21 periods
- EMA Slow: 48 periods
- RSI Length: 14 periods
- RSI Min Long: 42
- RSI Max Short: 58
- Timeframe: 30 seconds (synthetic bars)

### Peach Hybrid Strategy

The **Peach Hybrid strategy** combines two systems:

**V1 System (Trend/Bias):**
- Multi-EMA configuration for trend detection
- Micro EMAs for fine-tuned entry timing
- RSI-based bias confirmation
- Minimum move percentage filters

**V2 System (Momentum Surge):**
- Volume-based momentum detection
- Volume multiplier thresholds
- Exit volume analysis
- Momentum surge identification

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20 or higher ([Download](https://nodejs.org/))
- **npm** (comes bundled with Node.js) or **pnpm**/**bun** (optional)
- **AsterDEX Account**: Create an account at [asterdex.com](https://asterdex.com)
- **API Credentials**: Generate API key and secret from AsterDEX dashboard
- **Dedicated Wallet**: A wallet private key dedicated to this bot (recommended for security)

## Installation

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd aster-bot
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp env.example .env.local
```

Edit `.env.local` with your AsterDEX credentials and trading parameters. See [Configuration](#configuration) section for details.

### Step 4: Run the Bot

**Development Mode (Dashboard):**
```bash
npm run dev
```
Visit `http://localhost:3000` to access the trading dashboard and monitor bot activity.

**Headless Bot Mode:**
```bash
npm run bot
```
This starts the trading bot in headless mode, connecting to AsterDEX tick stream and executing the configured strategy.

## Configuration

### Environment Variables

The bot uses environment variables for configuration. Here's a comprehensive overview:

#### Exchange Configuration

| Variable | Description | Example |
| --- | --- | --- |
| `ASTER_RPC_URL` | AsterDEX REST API endpoint | `https://fapi.asterdex.com` |
| `ASTER_WS_URL` | AsterDEX WebSocket endpoint | `wss://fstream.asterdex.com/ws` |
| `ASTER_API_KEY` | Your AsterDEX API key | Generated from asterdex.com |
| `ASTER_API_SECRET` | Your AsterDEX API secret | Generated from asterdex.com |
| `ASTER_PRIVATE_KEY` | Wallet private key for trading | Your dedicated wallet key |
| `PAIR_SYMBOL` | Trading pair symbol | `ASTERUSDT-PERP` |

#### Strategy Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `STRATEGY_TYPE` | Strategy to use: `watermellon` or `peach-hybrid` | `peach-hybrid` |
| `VIRTUAL_TIMEFRAME_MS` | Synthetic bar timeframe in milliseconds | `30000` (30 seconds) |

#### Watermellon Strategy Parameters

| Variable | Description | Default |
| --- | --- | --- |
| `EMA_FAST` | Fast EMA period | `8` |
| `EMA_MID` | Mid EMA period | `21` |
| `EMA_SLOW` | Slow EMA period | `48` |
| `RSI_LENGTH` | RSI calculation period | `14` |
| `RSI_MIN_LONG` | Minimum RSI for long signals | `42` |
| `RSI_MAX_SHORT` | Maximum RSI for short signals | `58` |

#### Peach Hybrid Strategy Parameters

**V1 System:**
- `PEACH_V1_EMA_FAST`, `PEACH_V1_EMA_MID`, `PEACH_V1_EMA_SLOW`
- `PEACH_V1_EMA_MICRO_FAST`, `PEACH_V1_EMA_MICRO_SLOW`
- `PEACH_V1_RSI_LENGTH`, `PEACH_V1_RSI_MIN_LONG`, `PEACH_V1_RSI_MAX_SHORT`
- `PEACH_V1_MIN_BARS_BETWEEN`, `PEACH_V1_MIN_MOVE_PCT`

**V2 System:**
- `PEACH_V2_EMA_FAST`, `PEACH_V2_EMA_MID`, `PEACH_V2_EMA_SLOW`
- `PEACH_V2_RSI_MOMENTUM_THRESHOLD`
- `PEACH_V2_VOLUME_LOOKBACK`, `PEACH_V2_VOLUME_MULTIPLIER`
- `PEACH_V2_EXIT_VOLUME_MULTIPLIER`

#### Risk Management Parameters

| Variable | Description | Default |
| --- | --- | --- |
| `MAX_POSITION_USDT` | Maximum position size in USDT | `10000` |
| `MAX_LEVERAGE` | Maximum leverage (5x, 10x, 20x, 50x, 1000x premium) | `5` |
| `MAX_FLIPS_PER_HOUR` | Maximum position flips per hour | `12` |
| `MAX_POSITIONS` | Maximum concurrent positions | `1` |
| `STOP_LOSS_PCT` | Stop-loss percentage from entry | `0` (disabled) |
| `TAKE_PROFIT_PCT` | Take-profit percentage from entry | `0` (disabled) |
| `USE_STOP_LOSS` | Enable stop-loss | `false` |
| `EMERGENCY_STOP_LOSS_PCT` | Emergency stop-loss percentage | `2.0` |
| `MODE` | Execution mode: `dry-run` or `live` | `dry-run` |

### Security Best Practices

1. **Dedicated Wallet**: Use a separate wallet for the bot with limited funds
2. **No Withdrawal Permissions**: Configure API keys without withdrawal permissions
3. **Environment Variables**: Never commit `.env.local` to version control
4. **Private Keys**: Store private keys securely and never share them

## Usage

### Starting the Dashboard

```bash
npm run dev
```

Access the dashboard at `http://localhost:3000` to:
- View trading strategy specifications
- Monitor bot status
- Analyze trading signals
- Review performance metrics

### Running the Trading Bot

```bash
npm run bot
```

The bot will:
1. Load configuration from `.env.local`
2. Connect to AsterDEX WebSocket tick stream
3. Build synthetic bars from tick data
4. Calculate technical indicators (EMA, RSI)
5. Generate trading signals based on strategy
6. Execute trades (dry-run or live based on `MODE`)

### Dry-Run Testing

Before going live, always test in dry-run mode:

1. Set `MODE=dry-run` in `.env.local`
2. Run `npm run bot`
3. Monitor logs for trade signals
4. Verify strategy behavior matches expectations
5. Switch to `MODE=live` only after thorough testing

## Project Structure

```
aster-bot/
├── src/
│   ├── app/                    # Next.js dashboard application
│   │   ├── api/                # API routes
│   │   │   └── spec/           # Strategy specification endpoint
│   │   ├── page.tsx            # Dashboard page
│   │   └── layout.tsx          # App layout
│   ├── bot/                    # Headless bot entry point
│   │   └── index.ts            # Bot runner script
│   └── lib/                    # Core trading library
│       ├── bot/                # Strategy orchestration
│       │   └── botRunner.ts    # Main bot execution logic
│       ├── indicators/         # Technical indicators
│       │   ├── ema.ts          # Exponential Moving Average
│       │   ├── rsi.ts          # Relative Strength Index
│       │   └── adx.ts          # Average Directional Index
│       ├── execution/          # Trade execution adapters
│       │   ├── dryRunExecutor.ts    # Dry-run execution
│       │   ├── liveExecutor.ts      # Live execution
│       │   └── orderTracker.ts      # Order tracking
│       ├── rest/               # REST API client
│       │   └── restPoller.ts   # Polling for account data
│       ├── security/           # Security utilities
│       │   └── keyManager.ts   # Key management
│       ├── state/              # State management
│       │   ├── positionState.ts      # Position tracking
│       │   └── statePersistence.ts   # State persistence
│       ├── tickStream.ts       # WebSocket tick stream client
│       ├── virtualBarBuilder.ts      # Synthetic bar builder
│       ├── watermellonEngine.ts      # Watermellon strategy engine
│       ├── peachHybridEngine.ts      # Peach Hybrid strategy engine
│       ├── config.ts           # Configuration parser (Zod)
│       ├── spec.ts             # Strategy specifications
│       └── types.ts            # TypeScript type definitions
├── data/                       # Bot state persistence
│   └── bot-state.json         # Saved bot state
├── test-data/                 # Test data files
├── env.example                # Environment variables template
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                   # This file
```

## Risk Management

The bot includes comprehensive risk management features:

### Position Limits
- **Maximum Position Size**: Configurable in USDT to limit exposure
- **Maximum Leverage**: Set leverage ceiling (5x, 10x, 20x, 50x, or 1000x for premium)
- **Maximum Positions**: Limit concurrent open positions

### Stop-Loss Protection
- **Regular Stop-Loss**: Percentage-based stop-loss from entry price
- **Emergency Stop-Loss**: Hard stop at configured percentage (default 2%)
- **Trailing Stop-Loss**: Tracks highest/lowest prices for dynamic stops

### Trading Limits
- **Flip Rate Limiting**: Prevents excessive position flipping (max per hour)
- **Signal Deduplication**: Avoids duplicate trade signals
- **Freeze Mechanism**: Temporarily halts trading under certain conditions

### Best Practices
1. **Start Small**: Begin with minimum position sizes
2. **Use Dry-Run**: Test extensively before live trading
3. **Monitor Closely**: Watch bot performance, especially initially
4. **Set Stop-Losses**: Always configure stop-loss protection
5. **Limit Leverage**: Use conservative leverage initially
6. **Dedicated Funds**: Only use funds you can afford to lose

## FAQ

### General Questions

**Q: What is AsterDEX?**  
A: AsterDEX is a cryptocurrency derivatives exchange. This bot is designed specifically for trading on AsterDEX's perpetual futures markets.

**Q: Is this bot safe to use?**  
A: The bot includes risk management features, but trading cryptocurrencies carries inherent risks. Always use dry-run mode first, start with small positions, and never trade more than you can afford to lose.

**Q: Can I use this bot on other exchanges?**  
A: Currently, the bot is designed specifically for AsterDEX. Adapting it to other exchanges would require modifications to the exchange API integration.

**Q: How much can I make with this bot?**  
A: Trading results vary based on market conditions, strategy parameters, and risk settings. Past performance does not guarantee future results. Always test thoroughly in dry-run mode.

### Technical Questions

**Q: What programming language is this written in?**  
A: The bot is written in **TypeScript** and uses **Next.js** for the dashboard interface.

**Q: Do I need to know programming to use this?**  
A: Basic command-line knowledge is helpful, but the bot can be configured through environment variables without deep programming knowledge.

**Q: How do I update the bot?**  
A: Pull the latest changes from the repository and run `npm install` to update dependencies.

**Q: Can I modify the trading strategies?**  
A: Yes! The code is open source. You can modify strategy parameters or create custom strategies by extending the engine classes.

**Q: What happens if the bot crashes?**  
A: The bot includes state persistence, so it can resume from the last saved state after a restart. However, always monitor the bot and ensure it's running properly.

### Trading Questions

**Q: What is the Watermellon strategy?**  
A: The Watermellon strategy uses a triple EMA stack (8/21/48) with RSI(14) filters to identify trend-following opportunities with momentum confirmation.

**Q: What is the Peach Hybrid strategy?**  
A: The Peach Hybrid strategy combines trend detection (V1) with momentum surge identification (V2) for more sophisticated signal generation.

**Q: How often does the bot trade?**  
A: Trading frequency depends on market conditions and strategy parameters. The bot includes flip rate limiting to prevent overtrading.

**Q: Can I backtest strategies?**  
A: The bot currently focuses on live/dry-run execution. For backtesting, you would need to implement historical data replay functionality.

## Contributing

Contributions are welcome! If you'd like to contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly in dry-run mode
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Areas for Contribution

- Additional trading strategies
- Enhanced risk management features
- Backtesting capabilities
- Performance optimizations
- Documentation improvements
- Bug fixes and testing

## Keywords

**Trading Bot Keywords:**
- automated trading bot
- cryptocurrency trading bot
- algorithmic trading
- crypto trading automation
- trading bot for AsterDEX
- scalping bot
- automated crypto trading
- trading strategy bot

**Technical Keywords:**
- EMA trading strategy
- RSI indicator trading
- technical analysis bot
- algorithmic trading system
- TypeScript trading bot
- Next.js trading dashboard
- WebSocket trading bot
- real-time trading bot

**Exchange Keywords:**
- AsterDEX trading bot
- AsterDEX automation
- AsterDEX API integration
- perpetual futures trading
- derivatives trading bot

**Strategy Keywords:**
- Watermellon strategy
- Peach Hybrid strategy
- EMA crossover strategy
- RSI momentum trading
- trend following bot
- momentum trading bot

---

## Contact

For support, questions, or collaboration opportunities:

- **Twitter/X**: [@kinexbt](https://x.com/cryptomoonday)
- **Telegram**: [@kinexbt](https://t.me/cryptomoonday23)
- **Discord**: @cryptomoonday

## Donation

If you find this project useful and would like to support its development:

**Donation Address**: `F959q6hGMgyd9o2BehxVd1tqMz46hJthospeX1PKuhbm`

---

**Disclaimer**: This software is provided for educational and research purposes. Cryptocurrency trading involves substantial risk of loss. Use at your own risk. The authors and contributors are not responsible for any financial losses incurred through the use of this software.

**Support**: For issues, questions, or contributions, please open an issue on the repository.

**Star this repository** if you find it useful!

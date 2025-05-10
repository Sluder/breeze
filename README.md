<div align="center">
    <h1 align="center">Breeze</h1>
    <p align="center">Cardano trading bot framework</p>
    <p align="center">Build on top of Indigo's Iris & Dexter</p>
</div>

- [Iris](https://github.com/IndigoProtocol/iris) : Cardano DEX data aggregator
- [Iris SDK](https://github.com/IndigoProtocol/indigo-sdk) : SDK for interacting with Iris
- [Dexter](https://github.com/IndigoProtocol/dexter) : Cardano DEX swap aggregator

### What can you do?
- Automate any trading strategy.
- Receive notifications on placed orders.
- Run backtests on historical data using Iris.
- Auto-cancel long pending orders.

### Install

##### NPM
```
npm i @sluder/breeze
```

##### Yarn
```
yarn add @sluder/breeze
```

### Quick Start
Breeze can be included in any application to provide automated Cardano DEX trading. Here is a snippet
to instantiate a TradeEngine :

```js
const engine: TradeEngine = new TradeEngine(
    [
        new CustomStrategy({
            runEveryMilliseconds: 5 * 1000, // Strategy will run every 5 secs
            autoCancelAfterSeconds: 60 * 5, // Orders will cancel after 5 mins
            walletAccountIndex: 0,          // Separate strategy balances within the same wallet
            params: {
                slippagePercent: 5,
                // ... other parameters your strategy requires
            },
        }),
        // ... other strategies
    ],
    {
        appName: 'TradingBot',
        canSubmitOrders: true,
        irisWebsocketHost: process.env.IRIS_WEBSOCKET_HOST ?? '',
        irisApiHost: process.env.IRIS_API_HOST ?? '',
        seedPhrase: process.env.SEED_PHRASE?.split(',') ?? [],
        submissionProviderConfig: {
            kupoUrl: (process.env.KUPO_SECURE === 'true' ? 'https://' : 'http://') + (process.env.KUPO_HOST ?? '') + ':' + process.env.KUPO_PORT,
            ogmiosUrl: (process.env.OGMIOS_SECURE === 'true' ? 'https://' : 'http://') + (process.env.OGMIOS_HOST ?? '') + ':' + process.env.OGMIOS_PORT,
        },
        logDirectory: '../logs',
        neverSpendAda: 10, // 10 ADA will never be spent & used as a buffer for network fees
        backtest: {        // Runs a local API server for submitting backtests
            port: 9999,
            enabled: true,
        },
        database: {
            file: './src/database/bot.db',
        },
        notifications: {
            notifiers: [
                new SlackNotifier(process.env.SLACK_OAUTH_TOKEN ?? '', process.env.SLACK_CHANNEL_ID ?? ''),
            ],
        },
    }
);

await engine.boot();
```

### Strategies
All custom strategies must extend the `BaseStrategy` interface, and is called upon automatically depending on the setup.
For acting on live websocket data, implement the `onWebsocketMessage(message: WsResponse)` function to receive all DEX updates.
To run your strategy on a timer, implement the `onTimer()` function which is called on an interval depending on the `runEveryMilliseconds`.

All possible functions a strategy can implement from Breeze :

```js
/**
 * Strategy is being backtested. Do some set up.
 */
public beforeBacktest(app: TradeEngine, backtest: Backtest): Promise<any>;

/**
 * Iris data is being pulled within this gap. Allows some data set up.
 */
public beforeDataPull(fromTimestamp: number, toTimestamp: number): Promise<any>;

/**
 * Strategy is being shutdown. Cleanup.
 */
public onShutdown(app: TradeEngine): Promise<any>;

/**
 * Receiving a new websocket message from Iris.
 */
public onWebsocketMessage(message: WsResponse): Promise<any>;

/**
 * Runs on interval set on the engine configuration.
 */
public onTimer(): Promise<any>;
```

### Backtesting
Breeze allows backtests to be ran on your custom strategies. To accomplish this, a connector service (API)
is ran on your local instance that you can use as you see fit.

Note : All wallet balances can be mocked for a backtest, and does not use actual balances in your connected wallet.

#### API
<details>
<summary><code>GET /backtest</code> Health check</summary>
</details>

<br>

<details>
<summary><code>POST /backtest</code> Run a backtest</summary>

##### Parameters
- fromTimestamp | int = Unix timestamp for historical data 
- toTimestamp | int = Unix timestamp for historical data
- strategyName | string = Name of custom strategy to run test on
- initialBalances | Map<string, bigint> = Concatenated asset IDs with balance
- filteredAssets | string[] = = Concatenated asset IDs
</details>

<br>

<details>
<summary><code>GET /backtest/status</code> Status of current backtest</summary>
</details>

<br>

<details>
<summary><code>GET /backtest/orders</code> Orders would've been made in current backtest</summary>
</details>

<br>

<details>
<summary><code>GET /strategies</code> Retrieve list of possible strategies to run backtest on</summary>
</details>

### Notifications
Breeze supplies the ability to trigger Slack notifications on orders made from your bot.
This repository includes a partial Twilio implementation, but is not complete due to difficult
laws preventing easy access to SMS notifications. An alternate SMS service may be included at some point.

### Finally
Developers of this package are not liable for the loss of any funds, or issues related to the loss of funds.
Use at your own risk.

A word of advice is to always start with very low funds when testing a strategy, or when first using Breeze to ensure
everything is working as it should.

Have fun building your bot ;)

# Project Classes Documentation

This documentation provides an overview of all classes within the `/src` directory, including their main responsibilities and key methods.

---

## Root Classes

### `TradeEngine`
- **Location:** `src/TradeEngine.ts`
- **Description:** The core orchestrator for trading strategies, jobs, and services. Manages configuration, logging, and the lifecycle of strategies and jobs.
- **Key Methods:** `boot()`, `shutdown()`, `logInfo()`, `logError()`, and various getters for services and configuration.

### `BaseStrategy` (abstract)
- **Location:** `src/BaseStrategy.ts`
- **Description:** Abstract base for trading strategies. Defines the interface and shared logic for all strategies.

---

## Entities

### `Order`
- **Location:** `src/entities/Order.ts`
- **Description:** Represents a trade order.

### `BacktestOrder` (extends `Order`)
- **Location:** `src/entities/BacktestOrder.ts`
- **Description:** Represents an order used in backtesting.

### `Backtest`
- **Location:** `src/entities/Backtest.ts`
- **Description:** Represents a backtest session.

---

## Storage

### `BaseCacheStorage` (abstract)
- **Location:** `src/storage/BaseCacheStorage.ts`
- **Description:** Abstract cache storage interface.
- **Key Methods:** `boot()`, `setKey()`, `getKey()`, `deleteKey()`, `flushAll()`, `keys()`

### `NodeCacheStorage` (extends `BaseCacheStorage`)
- **Location:** `src/storage/NodeCacheStorage.ts`
- **Description:** Implements cache storage using the `node-cache` library.

---

## Services

### `WalletService`
- **Location:** `src/services/WalletService.ts`
- **Description:** Manages wallet loading, balance tracking, and integration with Lucid and Dexter.

### `OrderService`
- **Location:** `src/services/OrderService.ts`
- **Description:** Handles order-related events, especially those from the websocket.

### `NotificationService`
- **Location:** `src/services/NotificationService.ts`
- **Description:** Sends notifications using configured notifiers.

### `IndicatorService`
- **Location:** `src/services/IndicatorService.ts`
- **Description:** Provides access to various indicator modules (trend, volume, volatility, momentum).

### `DatabaseService`
- **Location:** `src/services/DatabaseService.ts`
- **Description:** Manages the SQLite database connection and migrations. Provides access to query runners.

### `ConnectorService`
- **Location:** `src/services/ConnectorService.ts`
- **Description:** Sets up and runs the Express API server, registering controllers for strategies and backtesting.

#### Runners

- **`OrderQueryRunner`** (`src/services/runners/OrderQueryRunner.ts`): Runs queries related to orders.
- **`BacktestQueryRunner`** (`src/services/runners/BacktestQueryRunner.ts`): Runs queries related to backtests.

---

## Notifiers

### `BaseNotifier` (abstract)
- **Location:** `src/notifiers/BaseNotifier.ts`
- **Description:** Abstract base for notification services.

### `TwilioNotifier` (extends `BaseNotifier`)
- **Location:** `src/notifiers/TwilioNotifier.ts`
- **Description:** Sends notifications via Twilio SMS.

### `SlackNotifier` (extends `BaseNotifier`)
- **Location:** `src/notifiers/SlackNotifier.ts`
- **Description:** Sends notifications to Slack channels.

---

## Jobs

### `BaseJob` (abstract)
- **Location:** `src/jobs/BaseJob.ts`
- **Description:** Abstract base for scheduled jobs.

### `AutoCancelJob` (extends `BaseJob`)
- **Location:** `src/jobs/AutoCancelJob.ts`
- **Description:** Cancels orders that have not been settled within a configured time.

---

## Indicators

### `BaseIndicator` (abstract)
- **Location:** `src/indicators/BaseIndicator.ts`
- **Description:** Abstract base for all indicator classes.

#### Trend

- **`TrendIndicators`** (`src/indicators/trend/TrendIndicators.ts`): Provides SMA, EMA, TSMA, and TEMA calculations.
- **`SMA`** (`src/indicators/trend/sma.ts`): Simple Moving Average.
- **`EMA`** (`src/indicators/trend/ema.ts`): Exponential Moving Average.
- **`TSMA`** (`src/indicators/trend/tsma.ts`): Triple Simple Moving Average.
- **`TEMA`** (`src/indicators/trend/tema.ts`): Triple Exponential Moving Average.

#### Volume

- **`VolumeIndicators`** (`src/indicators/volume/VolumeIndicators.ts`): Placeholder for volume-based indicators.

#### Volatility

- **`VolatilityIndicators`** (`src/indicators/volatility/VolatilityIndicators.ts`): Placeholder for volatility-based indicators.

#### Momentum

- **`MomentumIndicators`** (`src/indicators/momentum/MomentumIndicators.ts`): Placeholder for momentum-based indicators.

---

## API

### `BaseController` (abstract)
- **Location:** `src/api/BaseController.ts`
- **Description:** Abstract base for API controllers.

### `StrategyController` (extends `BaseController`)
- **Location:** `src/api/StrategyController.ts`
- **Description:** API controller for strategy-related endpoints.

### `BacktestController` (extends `BaseController`)
- **Location:** `src/api/BacktestController.ts`
- **Description:** API controller for backtest-related endpoints.

---

*For more details on each class, see the respective source files in `/src`.*
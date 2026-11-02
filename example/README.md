# Example app

Demo application for
[`react-native-autoclicker-detection`](../README.md). It runs a scan on launch
and renders the risk level, score, contributing reasons, and the enabled
accessibility services with their allowlist and gesture-capability state.

## Running

From the repository root:

```sh
yarn install
yarn example android
```

The app is linked to the local library through the monorepo setup, so changes to
`src/` are picked up by Metro without reinstalling the package.

The library is a no-op on iOS. Running the example there is useful for checking
that application code handles the empty, `isAvailable() === false` case:

```sh
cd example
bundle install
bundle exec pod install
yarn ios
```

## What to look for

- Risk level and numeric score at the top of the screen.
- One line per contributing signal, in the order used by the scoring model.
- Enabled accessibility services, marked as allowlisted when applicable and as
  able to inject gestures when they declare that capability.

See the [main README](../README.md) for the API and the scoring model.

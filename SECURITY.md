# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| 0.1.x | Yes |

## Reporting a vulnerability

Please do not open a public issue for security problems.

Use GitHub's private vulnerability reporting:

https://github.com/nizar0x1f/react-native-autoclicker-detection/security/advisories/new

Include:

- the affected version and React Native version
- the platform and device or emulator
- reproduction steps or a proof of concept
- the impact you expect

You should receive an acknowledgement within 72 hours. A fix and advisory will
be published together once the issue is confirmed and a patch is available.

## Scope

This library reads on-device signals and returns them to JavaScript. It performs
no network requests and stores no data.

In scope:

- memory or data exposure beyond the documented signals
- crashes or denial of service caused by device input
- bypasses of the documented allowlist or scoring guarantees
- native code issues that affect the host application

Out of scope:

- detection evasion by a malicious app, which is an inherent limit of the
  heuristic and is documented in the README
- false positives for legitimate accessibility tools; use the allowlist or open
  a regular issue
- issues in React Native or Expo themselves

## Security considerations for integrators

The score is a risk signal, not a security boundary. Treat it as one input among
several and do not rely on it as the only factor for authentication, payments or
account authorisation.

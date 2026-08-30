# Security Policy

## Supported Versions

Currently, this repository is a portfolio project and only the `main` branch is maintained.

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please open an Issue or contact the repository owner directly.

## Important Note on Privacy

This application evaluates internship messages for scams. In the event that a message does not confidently trigger the client-side rule engine (i.e. is not immediately flagged as "Likely Fake"), the text of the message is sent to a third-party LLM (via the Groq API) for a semantic check.

> [!WARNING]
> While WhatsApp UI metadata is stripped out before the text is transmitted, the remaining raw text **is** sent to an external service for the majority of messages. Users should exercise caution and avoid pasting highly sensitive personal data.

# 📋 BizTrack Project

![Istanbul coverage](https://img.shields.io/badge/Istanbul%20coverage-95.86%25-brightgreen)

BizTrack is a web app born from my experience running a small business. It’s a tool designed to simplify managing products, orders, and expenses seamlessly. As a small business owner, I created BizTrack to simplify the complexities of managing products, orders, and expenses. The inspiration for this project came from the challenges I faced in my own business. I wanted to develop a solution that could benefit “myself” and others in a similar situation.

## 📝 DEMO

Please refer to --- https://biztrack-6tl.pages.dev/.

## 📷 Screenshots

![Biztrack Home page](assets/biztrack-home.png)

## 📌 Features

- **Product Management**: Add, edit, or remove products with a user-friendly interface.
- **Order Tracking**: View order details and status and manage the entire order fulfillment process from processing to delivery.
- **Expenses Management**: Log expenses, categorize them and maintain a clear overview of all financial transactions.
- **Insightful Dashboard**: Gives a quick snapshot of the business with a dashboard that displays summary stats such as revenue, expenses, the number of orders, and current balance.
- **Search and Sort Entries**: Use Tabulator-powered product, order, and expense tables with built-in sorting, pagination, and filtering.
- **Analytics**: Explore sales, expenses, trends, and summary/pivot views with ECharts and Tabulator.
- **Export to CSV**: Download all data tables into CSV seamlessly.
- **Internationalization**: Switch the interface between English and Chinese.
- **Privacy Compliance**: Cookie consent banner and a dedicated privacy policy page.
- **Safer Exports**: CSV values are escaped to reduce spreadsheet formula injection risk.
- **Test Coverage**: Core business and security helpers are covered by Vitest/Istanbul.

## ✅ Quality Checks

```bash
npm install
npm run typecheck
npm test
npm run build
```

Current Istanbul coverage from `npm test`:

- Statements: 95.86%
- Branches: 87.17%
- Functions: 98.38%
- Lines: 98.49%

## 🚀 Cloudflare Pages Deployment

This project uses Vite to compile TypeScript before deployment. Configure Cloudflare Pages with:

- Build command: `npm run build`
- Build output directory: `dist`

Do not deploy the repository root directly after the TypeScript migration. The HTML source files reference TypeScript entry points for local Vite development, and browsers need the compiled JavaScript assets generated in `dist`. Locale files live under `public/locales` so Vite copies them to `dist/locales` for runtime translation loading.

## 📦 Coursework Submission Files

The repository includes the URL files required for the CPT304 submission package:

- `github-url.txt`: repository URL for marker verification.
- `live-url.txt`: production deployment URL for live app testing.

Build and test evidence should be captured from `npm test`, `npm run build`, Cloudflare Pages deployment logs, and Lighthouse Accessibility reports before creating the final ZIP package.

## 💪🏾 Motivation

Why this project? 😼 It all started with my eagerness to learn more about web development. This project marks the end of my first module in the Get Coding program, and boy, have I learned a lot!

From understanding how JavaScript functions work to making web pages interactive, it's been quite the journey. One of the coolest parts was learning how to visualize and organize data with ECharts and Tabulator, which made everything more interesting. Through experimenting with different techniques like loops and if statements, I've not only improved my coding skills but also learned how to make websites easier to use for everyone.

This project represents my growth, determination, and love for coding. I hope you enjoy checking it out as much as I enjoyed making it!

## 💻 Tech Stack Used

- HTML
- CSS
- TypeScript
- Vite
- Tabulator
- ECharts

## 🤝 Acknowledgments

A special thanks to my coach, [Sam](https://github.com/samwise-nl), for the invaluable guidance and support provided throughout the development of this project, and the [GetCoding NL](https://www.getcoding.ca/coaching-program-nl) software development program team for their continuous check-ins.

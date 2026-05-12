// SIDEBAR TOGGLE

function openSidebar() {
  var side = document.getElementById('sidebar');
  side.style.display = (side.style.display === "block") ? "none" : "block";
}

function closeSidebar() {
  document.getElementById('sidebar').style.display = 'none';
}

const core = window.BizTrackCore;
const tables = window.BizTrackTables;
let salesChart;
let expensesChart;
let trendChart;
let summaryTable;

const defaultProducts = [
  {
    prodID: "PD001",
    prodName: "Baseball caps",
    prodDesc: "Peace embroidered cap",
    prodCat: "Hats",
    prodPrice: 25.00,
    prodSold: 20
  },
  {
    prodID: "PD002",
    prodName: "Water bottles",
    prodDesc: "Floral lotus printed bottle",
    prodCat: "Drinkware",
    prodPrice: 48.50,
    prodSold: 10
  },
  {
    prodID: "PD003",
    prodName: "Sweatshirts",
    prodDesc: "Palestine sweater",
    prodCat: "Clothing",
    prodPrice: 17.50,
    prodSold: 70
  },
  {
    prodID: "PD004",
    prodName: "Posters",
    prodDesc: "Vibes printed poster",
    prodCat: "Home decor",
    prodPrice: 12.00,
    prodSold: 60
  },
  {
    prodID: "PD005",
    prodName: "Pillow cases",
    prodDesc: "Morrocan print pillow case",
    prodCat: "Accessories",
    prodPrice: 17.00,
    prodSold: 40
  },
];

const defaultExpenses = [
  {
    trID: 1,
    trDate: "2024-01-05",
    trCategory: "Rent",
    trAmount: 100.00,
    trNotes: "January Rent"
  },
  {
    trID: 2,
    trDate: "2024-01-15",
    trCategory: "Order Fulfillment",
    trAmount: 35.00,
    trNotes: "Order #1005"
  },
  {
    trID: 3,
    trDate: "2024-01-08",
    trCategory: "Utilities",
    trAmount: 120.00,
    trNotes: "Internet"
  },
  {
    trID: 4,
    trDate: "2024-02-05",
    trCategory: "Supplies",
    trAmount: 180.00,
    trNotes: "Embroidery Machine"
  },
  {
    trID: 5,
    trDate: "2024-01-25",
    trCategory: "Miscellaneous",
    trAmount: 20.00,
    trNotes: "Pizza"
  },
];

const defaultOrders = [
  {
    orderID: "1001",
    orderDate: "2024-01-05",
    itemName: "Baseball caps",
    itemPrice: 25.00,
    qtyBought: 2,
    shipping: 2.50,
    taxes: 9.00,
    orderTotal: 61.50,
    orderStatus: "Pending"
  },
  {
    orderID: "1002",
    orderDate: "2024-03-05",
    itemName: "Water bottles",
    itemPrice: 17.00,
    qtyBought: 3,
    shipping: 3.50,
    taxes: 6.00,
    orderTotal: 60.50,
    orderStatus: "Processing"
  },
  {
    orderID: "1003",
    orderDate: "2024-02-05",
    itemName: "Tote bags",
    itemPrice: 20.00,
    qtyBought: 4,
    shipping: 2.50,
    taxes: 2.00,
    orderTotal: 84.50,
    orderStatus: "Shipped"
  },
  {
    orderID: "1004",
    orderDate: "2023-01-05",
    itemName: "Canvas prints",
    itemPrice: 55.00,
    qtyBought: 1,
    shipping: 2.50,
    taxes: 19.00,
    orderTotal: 76.50,
    orderStatus: "Delivered"
  },
  {
    orderID: "1005",
    orderDate: "2024-01-15",
    itemName: "Beanies",
    itemPrice: 15.00,
    qtyBought: 2,
    shipping: 3.90,
    taxes: 4.00,
    orderTotal: 37.90,
    orderStatus: "Pending"
  },
];

function dashboardT(key, params) {
  return window.BizTrackI18n?.useDashboardI18n().t(key, params)
    || window.BizTrackI18n?.useCommonI18n().t(key, params)
    || key;
}

function getDashboardData() {
  return {
    products: core.parseStoredArray(localStorage, "bizTrackProducts", defaultProducts),
    expenses: core.parseStoredArray(localStorage, "bizTrackTransactions", defaultExpenses),
    orders: core.parseStoredArray(localStorage, "bizTrackOrders", defaultOrders),
  };
}

function renderDashboard() {
  const data = getDashboardData();
  renderDashboardMetrics(data);
  initializeChart(data);
  renderSummaryPivot(data);
}

function renderDashboardMetrics(data = getDashboardData()) {
  const totalExpenses = calculateExpTotal(data.expenses);
  const totalRevenues = calculateRevTotal(data.orders);
  const totalBalance = totalRevenues - totalExpenses;
  const numOrders = data.orders.length;

  renderMetric(document.getElementById('rev-amount'), "Revenue", formatCurrency(totalRevenues));
  renderMetric(document.getElementById('exp-amount'), "Expenses", formatCurrency(totalExpenses));
  renderMetric(document.getElementById('balance'), "Balance", formatCurrency(totalBalance));
  renderMetric(document.getElementById('num-orders'), "Orders", numOrders);
}

function calculateExpTotal(transactions) {
  return core.sumBy(transactions, "trAmount");
}

function calculateRevTotal(orders) {
  return core.sumBy(orders, "orderTotal");
}

function renderMetric(container, title, value) {
  if (!container) return;

  container.replaceChildren();
  const titleSpan = document.createElement("span");
  titleSpan.className = "title";
  titleSpan.textContent = dashboardT(title);
  const valueSpan = document.createElement("span");
  valueSpan.className = "amount-value";
  valueSpan.textContent = value;
  container.append(titleSpan, valueSpan);
}

// ---------- CHARTS ----------

function calculateCategorySales(products) {
  return products.reduce((categorySales, product) => {
    const category = product.prodCat;
    categorySales[category] = (categorySales[category] || 0)
      + core.toFiniteNumber(product.prodPrice) * core.toFiniteNumber(product.prodSold);
    return categorySales;
  }, {});
}

function calculateCategoryExpenses(transactions) {
  return transactions.reduce((categoryExpenses, transaction) => {
    const category = transaction.trCategory;
    categoryExpenses[category] = (categoryExpenses[category] || 0) + core.toFiniteNumber(transaction.trAmount);
    return categoryExpenses;
  }, {});
}

function calculateCategoryUnits(products) {
  return products.reduce((categoryUnits, product) => {
    const category = product.prodCat;
    categoryUnits[category] = (categoryUnits[category] || 0) + core.toFiniteNumber(product.prodSold);
    return categoryUnits;
  }, {});
}

function calculateCategoryCounts(items, categoryKey) {
  return items.reduce((counts, item) => {
    const category = item[categoryKey];
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
}

function sortedEntries(data) {
  return Object.entries(data).sort(([, a], [, b]) => b - a);
}

function formatCurrency(value) {
  return tables?.formatCurrency(value) || `$${Number(value || 0).toFixed(2)}`;
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "";
}

function chartColors() {
  return ["#249672", "#247BA0", "#e49273", "#A37A74", "#9AADBF", "#634844"];
}

function renderEChart(currentChart, elementId, options) {
  const element = document.getElementById(elementId);
  if (!element || !window.echarts) return currentChart;

  if (currentChart) currentChart.dispose();
  const chart = window.echarts.init(element);
  chart.setOption(options);
  return chart;
}

function initializeChart(data = getDashboardData()) {
  renderSalesChart(data.products);
  renderExpensesChart(data.expenses);
  renderTrendChart(data.orders, data.expenses);
}

function renderSalesChart(products) {
  const entries = sortedEntries(calculateCategorySales(products));

  salesChart = renderEChart(salesChart, "bar-chart", {
    color: chartColors(),
    grid: {
      top: 24,
      right: 16,
      bottom: 56,
      left: 62,
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: formatCurrency,
    },
    xAxis: {
      type: "category",
      data: entries.map(([category]) => dashboardT(category)),
      axisLabel: {
        interval: 0,
        rotate: entries.length > 4 ? 25 : 0,
      },
    },
    yAxis: {
      type: "value",
      name: dashboardT("Total Sales ($)"),
      axisLabel: {
        formatter(value) {
          return `$${value}`;
        },
      },
    },
    series: [
      {
        name: dashboardT("Total Sales"),
        type: "bar",
        data: entries.map(([, value]) => Number(value.toFixed(2))),
        barMaxWidth: 54,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  });
}

function renderExpensesChart(expenses) {
  const entries = sortedEntries(calculateCategoryExpenses(expenses));

  expensesChart = renderEChart(expensesChart, "donut-chart", {
    color: chartColors().slice().reverse(),
    tooltip: {
      trigger: "item",
      valueFormatter: formatCurrency,
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      left: 0,
      top: "middle",
    },
    series: [
      {
        name: dashboardT("Expenses"),
        type: "pie",
        radius: ["46%", "72%"],
        center: ["62%", "52%"],
        avoidLabelOverlap: true,
        label: {
          formatter: "{b}\n{d}%",
        },
        data: entries.map(([category, value]) => ({
          name: dashboardT(category),
          value: Number(value.toFixed(2)),
        })),
      },
    ],
  });
}

function renderTrendChart(orders, expenses) {
  const revenueByMonth = groupAmountByMonth(orders, "orderDate", "orderTotal");
  const expensesByMonth = groupAmountByMonth(expenses, "trDate", "trAmount");
  const months = Array.from(new Set([
    ...Object.keys(revenueByMonth),
    ...Object.keys(expensesByMonth),
  ])).sort();

  trendChart = renderEChart(trendChart, "trend-chart", {
    color: ["#249672", "#e49273"],
    grid: {
      top: 28,
      right: 20,
      bottom: 44,
      left: 62,
    },
    tooltip: {
      trigger: "axis",
      valueFormatter: formatCurrency,
    },
    legend: {
      top: 0,
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: months,
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter(value) {
          return `$${value}`;
        },
      },
    },
    series: [
      {
        name: dashboardT("Revenue"),
        type: "line",
        smooth: true,
        data: months.map((month) => Number((revenueByMonth[month] || 0).toFixed(2))),
      },
      {
        name: dashboardT("Expenses"),
        type: "line",
        smooth: true,
        data: months.map((month) => Number((expensesByMonth[month] || 0).toFixed(2))),
      },
    ],
  });
}

function groupAmountByMonth(items, dateKey, amountKey) {
  return items.reduce((months, item) => {
    const month = String(item[dateKey] || "Unknown").slice(0, 7);
    months[month] = (months[month] || 0) + core.toFiniteNumber(item[amountKey]);
    return months;
  }, {});
}

function resizeDashboardCharts() {
  [salesChart, expensesChart, trendChart].forEach((chart) => chart?.resize());
}

// ---------- SUMMARY / PIVOT TABLE ----------

function buildSummaryPivotRows(data) {
  const salesByCategory = calculateCategorySales(data.products);
  const unitsByCategory = calculateCategoryUnits(data.products);
  const productCounts = calculateCategoryCounts(data.products, "prodCat");
  const expensesByCategory = calculateCategoryExpenses(data.expenses);
  const expenseCounts = calculateCategoryCounts(data.expenses, "trCategory");
  const totalSales = Object.values(salesByCategory).reduce((total, value) => total + value, 0);
  const totalExpenses = calculateExpTotal(data.expenses);

  const salesRows = Object.keys(salesByCategory).map((category) => {
    const revenue = salesByCategory[category];
    return {
      section: "Sales",
      category: dashboardT(category),
      records: productCounts[category] || 0,
      units: unitsByCategory[category] || 0,
      revenue,
      expenses: 0,
      net: revenue,
      share: totalSales ? revenue / totalSales * 100 : 0,
    };
  });

  const expenseRows = Object.keys(expensesByCategory).map((category) => {
    const expenseAmount = expensesByCategory[category];
    return {
      section: "Expenses",
      category: dashboardT(category),
      records: expenseCounts[category] || 0,
      units: 0,
      revenue: 0,
      expenses: expenseAmount,
      net: -expenseAmount,
      share: totalExpenses ? expenseAmount / totalExpenses * 100 : 0,
    };
  });

  return [...salesRows, ...expenseRows];
}

function buildSummaryColumns() {
  return [
    tables.plainTextColumn(dashboardT("Type"), "section", { visible: false }),
    tables.plainTextColumn(dashboardT("Category"), "category"),
    {
      title: dashboardT("Records"),
      field: "records",
      hozAlign: "right",
      sorter: "number",
      bottomCalc: "sum",
    },
    {
      title: dashboardT("Units"),
      field: "units",
      hozAlign: "right",
      sorter: "number",
      bottomCalc: "sum",
      formatter(cell) {
        const value = Number(cell.getValue());
        return value ? String(value) : "-";
      },
    },
    {
      title: dashboardT("Revenue"),
      field: "revenue",
      hozAlign: "right",
      sorter: "number",
      formatter: tables.currencyFormatter,
      bottomCalc: "sum",
      bottomCalcFormatter: tables.currencyFormatter,
    },
    {
      title: dashboardT("Expenses"),
      field: "expenses",
      hozAlign: "right",
      sorter: "number",
      formatter: tables.currencyFormatter,
      bottomCalc: "sum",
      bottomCalcFormatter: tables.currencyFormatter,
    },
    {
      title: dashboardT("Net"),
      field: "net",
      hozAlign: "right",
      sorter: "number",
      formatter(cell) {
        const value = core.toFiniteNumber(cell.getValue());
        const className = value < 0 ? "negative" : "positive";
        return `<span class="summary-money ${className}">${formatCurrency(value)}</span>`;
      },
      bottomCalc: "sum",
      bottomCalcFormatter(cell) {
        return formatCurrency(cell.getValue());
      },
    },
    {
      title: dashboardT("Share"),
      field: "share",
      hozAlign: "right",
      sorter: "number",
      formatter(cell) {
        return formatPercent(cell.getValue());
      },
    },
  ];
}

function renderSummaryPivot(data = getDashboardData()) {
  if (!document.getElementById("summary-pivot-table")) return;

  if (summaryTable) {
    summaryTable.destroy();
    summaryTable = null;
  }

  summaryTable = tables.createOrUpdateTable(summaryTable, "#summary-pivot-table", {
    data: buildSummaryPivotRows(data),
    columns: buildSummaryColumns(),
    groupBy: "section",
    groupHeader(value, count) {
      return `${tables.escapeHtml(dashboardT(value))} (${count})`;
    },
    maxHeight: "460px",
    paginationSize: 10,
    placeholder: dashboardT("No summary data"),
  });
}

window.addEventListener("DOMContentLoaded", renderDashboard);
window.addEventListener("resize", resizeDashboardCharts);
window.addEventListener("biztrack:languagechange", renderDashboard);

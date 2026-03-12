# Restaurant Analytics Insights

## Purpose

This document outlines the analytics and insights system for the restaurant dashboard. It defines the KPIs, charts, data structures, and analytics modules required to understand restaurant performance and make data‑driven decisions.

## 1. Dashboard Overview (Main KPI Cards)

The top section of the analytics dashboard should provide quick performance metrics through KPI cards.

## KPI Cards

## Total Revenue | Total Orders

Display together in a single card with the following filters:

- Today
- Yesterday
- This Week
- This Month  
  Purpose:  
  Provide quick insight into revenue generation and order volume.

## Average Order Value (AOV)

Formula:  
AOV = Total Revenue / Total Orders  
Purpose:  
Measure the average spending per order.

## Total Customers

Total number of unique customers.  
Purpose:  
Measure customer base growth.

## Repeat Customers %

Percentage of customers who have ordered more than once.  
Purpose:  
Measure customer retention and loyalty.

## Table Utilization %

Percentage of time tables are occupied.  
Purpose:  
Understand seating efficiency.

## Reservations vs Walk-ins

Shows ratio of customers who booked in advance vs those who walked in.  
Purpose:  
Understand reservation adoption.

## Cancellation Rate

Display cancellation percentage and total cancellations with filters:

- Today
- Yesterday
- This Week
- This Month  
  Purpose:  
  Track reservation reliability.

## Average Dining Duration

Average time a customer occupies a table.  
Purpose:  
Optimize table turnover.

## Top Selling Item Today

Item with highest order count for the day.  
Purpose:  
Highlight popular menu items.

## 2. Revenue Analytics

## Revenue Over Time

Chart Type: Line Chart  
Filters:

- Today
- Last 7 Days
- Last 30 Days
- Last Month
- Custom Date  
  Data Format:  
  Date | Revenue  
  Purpose:  
  Identify revenue growth or decline trends.

## Revenue by Hour

Chart Type: Bar Chart  
Main Filter:

- By Revenue
- By Visits  
  Sub Filters:
- Today
- Last 7 Days
- Last 30 Days
- Last Month
- Custom Date  
  Data Format:  
  Hour | Revenue  
  Hour | Customer Visits  
  Purpose:  
  Identify peak business hours and schedule staff accordingly.

## 3. Menu Performance Analytics

## Most Popular Items

Chart Type: Horizontal Bar Chart  
Data Format:  
Item Name | Orders Count  
Filters:

- Category
- Ascending
- Descending
- Revenue by Item  
  Additional Requirement:  
  Menu may contain 150–200 items. Implement pagination in the chart so data updates based on page.  
  Purpose:
- Highlight best selling items
- Promote top items on homepage
- Identify high profit items

## Category Performance

Chart Type: Pie Chart  
Categories:

- Starter
- Main Course
- Dessert
- Cocktail  
  Purpose:  
  Understand which menu category generates the most sales.

## Jain vs Regular Orders

Chart Type: Pie Chart  
Data:

- Jain Orders %
- Regular Orders %  
  Purpose:  
  Understand demand for Jain food.

## 4. Reservation Analytics

## Reservation vs Walk-in

Chart Type: Pie Chart  
Data:

- Online Reservations
- Walk-in Customers  
  Purpose:  
  Understand how many customers come through reservations vs walk-ins.

## Reservation Status Breakdown

Chart Type: Bar Chart  
Statuses:

- Confirmed
- Seated
- Completed
- Cancelled
- No Show  
  Filters:
- Today
- Last 7 Days
- Last 30 Days
- Last Month
- Custom Date  
  Data Format:  
  Status | Count  
  Purpose:  
  Track reservation quality and completion rate.

## Peak Reservation Time

Chart Type: Bar Chart  
Filters:

- Today
- Last 7 Days
- Last 30 Days
- Last Month
- Custom Date  
  Data Format:  
  Time Slot | Bookings  
  Purpose:  
  Identify busiest reservation hours.

## 5. Customer Analytics

## New vs Returning Customers

Chart Type: Pie Chart  
Data:

- New Customers
- Returning Customers  
  Purpose:  
  Measure customer loyalty.

## Repeat Customer Rate

Display in a card along with total number of repeat customers.  
Formula:  
Repeat Customer Rate = Customers with more than 1 order / Total Customers  
Purpose:  
Measure retention performance.

## Top Customers

Display only top 10 customers.  
Table Format:  
Name | Visits | Total Spent  
Purpose:  
Identify VIP customers and offer rewards.

## Visited Customer Distribution

Display as cards.  
Categories:

- 1 time visited
- 2 time visited
- 3 time visited
- 4 time visited
- 5 time visited
- 6 time visited
- 7 time visited
- 8 or more visits  
  Also display:  
  Total unique visited customers  
  Purpose:  
  Understand visit frequency distribution.

## 6. Order Insights

## Average Items Per Order

Formula:  
Average Items Per Order = Total Items Ordered / Total Orders  
Purpose:  
Understand ordering behavior and upselling opportunities.

## 7. Occasion Analytics

Occasion field should be captured during reservation or order.  
Chart Type: Pie Chart  
Occasion Types:

- Birthday
- Anniversary
- Party
- Casual  
  Purpose:
- Offer birthday packages
- Run anniversary promotions
- Understand celebration-based traffic

## 8. Database Tracking Recommendation

Important Note: This is for example, you first analyze current schemas and then all the insights and analytical requirement and then update schema according to that.  
Required Fields:

- order_id
- customer_id
- reservation_id
- table_id
- items
- quantity
- price
- timestamp
- order_status  
  Purpose:  
  These fields are necessary for generating accurate analytics, reports, and business insights.

## Summary

This analytics system will provide a complete data-driven overview of restaurant operations including revenue performance, customer behavior, reservation trends, and menu insights. The dashboard should allow filtering by date ranges and provide interactive charts to support strategic business decisions.

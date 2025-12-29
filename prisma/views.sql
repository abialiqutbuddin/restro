-- Views required for dashboard queries
-- Run this script on your MySQL database: mysql -u root -p restrodb < prisma/views.sql

-- v_event_totals: Aggregates order totals per event
CREATE OR REPLACE VIEW v_event_totals AS
SELECT
    e.id AS event_id,
    e.event_datetime,
    COALESCE(SUM(eco.line_subtotal), 0) AS items_total,
    COALESCE(e.delivery_charges, 0) AS delivery_charges,
    COALESCE(e.service_charges, 0) AS service_charges,
    COALESCE(e.sales_tax_amount, 0) AS sales_tax,
    (
        COALESCE(SUM(eco.line_subtotal), 0) +
        COALESCE(e.delivery_charges, 0) +
        COALESCE(e.service_charges, 0) +
        COALESCE(e.sales_tax_amount, 0)
    ) AS grand_total
FROM events e
LEFT JOIN event_caterings ec ON ec.event_id = e.id
LEFT JOIN event_catering_orders eco ON eco.event_catering_id = ec.id
GROUP BY e.id, e.event_datetime, e.delivery_charges, e.service_charges, e.sales_tax_amount;

-- v_event_payments: Aggregates payments per event
CREATE OR REPLACE VIEW v_event_payments AS
SELECT
    e.id AS event_id,
    COALESCE(SUM(ep.amount), 0) AS amount_paid
FROM events e
LEFT JOIN event_payments ep ON ep.event_gcal_id = e.gcalEventId AND ep.status = 'succeeded'
GROUP BY e.id;

import os
from pathlib import Path
from datetime import datetime
from decimal import Decimal
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def get_setting(db, key: str, default: str) -> str:
    if db is None:
        return default
    try:
        from app.models.settings import Setting
        setting = db.query(Setting).filter(Setting.key == key).first()
        return setting.value if setting else default
    except Exception:
        return default

def generate_invoice_pdf(order, shop_name: str, currency: str, tax_percent: float, invoice_dir: str, db = None) -> str:
    # Ensure directory exists
    Path(invoice_dir).mkdir(parents=True, exist_ok=True)
    
    filename = f"{order.order_number}_{int(datetime.utcnow().timestamp())}.pdf"
    pdf_path = os.path.join(invoice_dir, filename)
    
    # Query database settings
    tagline = get_setting(db, "tagline", "")
    phone = get_setting(db, "phone", "")
    address = get_setting(db, "address", "")
    tax_label = get_setting(db, "tax_label", "GST")
    show_tax_line = get_setting(db, "show_tax_line", "true") == "true"
    show_logo = get_setting(db, "show_logo_on_invoice", "true") == "true"
    logo_path = get_setting(db, "logo_path", "")
    receipt_header = get_setting(db, "invoice_header", get_setting(db, "receipt_header", ""))
    receipt_footer = get_setting(db, "invoice_footer", get_setting(db, "receipt_footer", "Thank you for your visit!"))
    paper_width_setting = get_setting(db, "paper_width", "80mm")
    
    # Paper dimensions based on 80mm vs 58mm width
    # 80mm width = 227 points. Printable width is 207 points.
    # 58mm width = 164 points. Printable width is 144 points.
    if paper_width_setting == "58mm":
        paper_width = 164
        col_widths = [74, 30, 40]
        sum_width = 114
        sum_col_widths = [84, 60]
    else:
        paper_width = 227
        col_widths = [117, 30, 60]
        sum_width = 120
        sum_col_widths = [120, 87]

    # Calculate height dynamically based on item count
    item_count = len(order.items)
    page_height = max(350, 180 + (item_count * 25) + 160)
    
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=(paper_width, page_height),
        leftMargin=10,
        rightMargin=10,
        topMargin=10,
        bottomMargin=10
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    style_shop = ParagraphStyle(
        'ShopName',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=14,
        alignment=TA_CENTER
    )
    
    style_header = ParagraphStyle(
        'ReceiptHeader',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    )
    
    style_meta_center = ParagraphStyle(
        'MetaCenter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=TA_CENTER
    )

    style_item_left = ParagraphStyle(
        'ItemLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    )
    
    style_item_center = ParagraphStyle(
        'ItemCenter',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=TA_CENTER
    )
    
    style_item_right = ParagraphStyle(
        'ItemRight',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=TA_RIGHT
    )
    
    style_bold_right = ParagraphStyle(
        'BoldRight',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=TA_RIGHT
    )

    style_bold_left = ParagraphStyle(
        'BoldLeft',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=TA_LEFT
    )
    
    style_footer = ParagraphStyle(
        'ReceiptFooter',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        leading=10,
        alignment=TA_CENTER
    )
    
    story = []
    
    # Logo
    if show_logo and logo_path:
        # Resolve logo_path relative to backend folder
        abs_logo_path = logo_path
        if not os.path.isabs(logo_path):
            abs_logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", logo_path))
        if os.path.exists(abs_logo_path):
            try:
                from reportlab.platypus import Image
                logo_img = Image(abs_logo_path, width=40, height=40)
                logo_img.hAlign = 'CENTER'
                story.append(logo_img)
                story.append(Spacer(1, 4))
            except Exception as e:
                print("Error loading logo image in invoice PDF:", e)

    # Shop Name
    story.append(Paragraph(shop_name, style_shop))
    story.append(Spacer(1, 4))
    
    # Tagline, Phone, Address
    meta_text = ""
    if tagline:
        meta_text += f"{tagline}<br/>"
    if address:
        meta_text += f"{address}<br/>"
    if phone:
        meta_text += f"Tel: {phone}<br/>"
    if receipt_header:
        meta_text += f"{receipt_header}<br/>"
        
    if meta_text:
        story.append(Paragraph(meta_text, style_meta_center))
        story.append(Spacer(1, 6))

    # Order Details
    date_str = (order.paid_at or order.created_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M:%S")
    details = f"""
    <b>Invoice:</b> {order.order_number}<br/>
    <b>Date:</b> {date_str}<br/>
    <b>Type:</b> {order.order_type.upper().replace('_', ' ')}<br/>
    """
    if order.table:
        details += f"<b>Table:</b> {order.table.name}<br/>"
    if order.staff:
        details += f"<b>Staff / Waiter:</b> {order.staff.name}<br/>"
    if order.customer_name:
        details += f"<b>Customer:</b> {order.customer_name}<br/>"
        
    story.append(Paragraph(details, style_header))
    story.append(Spacer(1, 8))
    
    # Table of Items
    style_bold_center = ParagraphStyle('BC', parent=style_bold_left, alignment=TA_CENTER)
    table_data = [
        [
            Paragraph("<b>Item</b>", style_bold_left),
            Paragraph("<b>Qty</b>", style_bold_center),
            Paragraph("<b>Total</b>", style_bold_right)
        ]
    ]
    
    for item in order.items:
        item_total = item.price * Decimal(str(item.quantity))
        qty_str = str(int(item.quantity) if float(item.quantity).is_integer() else item.quantity)
        table_data.append([
            Paragraph(item.name, style_item_left),
            Paragraph(qty_str, style_item_center),
            Paragraph(f"{currency} {item_total:.2f}", style_item_right)
        ])
        
    item_table = Table(table_data, colWidths=col_widths)
    item_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.black),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 8))
    
    # Summary Table
    summary_data = [
        [Paragraph("Subtotal", style_item_left), Paragraph(f"{currency} {order.subtotal:.2f}", style_item_right)],
    ]
    if show_tax_line:
        summary_data.append([Paragraph(f"{tax_label} ({tax_percent}%)", style_item_left), Paragraph(f"{currency} {order.tax:.2f}", style_item_right)])
    
    if order.discount > 0:
        summary_data.append([Paragraph("Discount", style_item_left), Paragraph(f"- {currency} {order.discount:.2f}", style_item_right)])
    
    summary_data.append([Paragraph("<b>Grand Total</b>", style_bold_left), Paragraph(f"<b>{currency} {order.total:.2f}</b>", style_bold_right)])
    
    summary_table = Table(summary_data, colWidths=sum_col_widths)
    summary_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('LINEABOVE', (0, -1), (-1, -1), 0.5, colors.black),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 12))
    
    # Footer
    if receipt_footer:
        story.append(Paragraph(receipt_footer, style_footer))
    
    # Promotional Free Marketing Line
    promo_text = "Software by Mujeeb no 03176240916"
    story.append(Spacer(1, 4))
    story.append(Paragraph(promo_text, style_footer))
    
    doc.build(story)
    return pdf_path

from pathlib import Path

path = Path(r"c:\Users\User\Documents\GitHub\ariqai foods- tinker\sections\product-list.liquid")
text = path.read_text(encoding='utf-8')
old = '''"price": {
              "type": "price",
              "name": "t:names.product_price",
              "settings": {
                "show_sale_price_first": true,
                "show_installments": false,
                "show_tax_info": false,
                "type_preset": "h6",
                "width": "100%",
                "alignment": "left",
                "font": "var(--font-body--family)",
                "font_size": "1rem",
                "line_height": "normal",
                "letter_spacing": "normal",
                "case": "none",
                "color": "var(--color-foreground)",
                "padding-block-start": 0,
                "padding-block-end": 0,
                "padding-inline-start": 0,
                "padding-inline-end": 0
              }
            }
          ,\n          "block_order": ["product-card-gallery", "product_title", "price"]'''
new = '''"price": {
              "type": "price",
              "name": "t:names.product_price",
              "settings": {
                "show_sale_price_first": true,
                "show_installments": false,
                "show_tax_info": false,
                "type_preset": "h6",
                "width": "100%",
                "alignment": "left",
                "font": "var(--font-body--family)",
                "font_size": "1rem",
                "line_height": "normal",
                "letter_spacing": "normal",
                "case": "none",
                "color": "var(--color-foreground)",
                "padding-block-start": 0,
                "padding-block-end": 0,
                "padding-inline-start": 0,
                "padding-inline-end": 0
              }
            },
            "buy_buttons": {
              "type": "buy-buttons",
              "name": "t:names.buy_buttons",
              "settings": {
                "style_class": "button",
                "alignment": "center",
                "width": "fill",
                "custom_width": 100,
                "width_mobile": "fill",
                "custom_width_mobile": 100
              }
            }
          },
          "block_order": ["product-card-gallery", "product_title", "price", "buy_buttons"]'''

for i in range(3):
    idx = text.find(old)
    if idx == -1:
        raise SystemExit(f"old snippet not found on iteration {i}")
    text = text[:idx] + new + text[idx + len(old):]

path.write_text(text, encoding='utf-8')
print('patched 3 blocks')

import re, html, os

base = os.path.dirname(os.path.abspath(__file__))
p = os.path.join(base, "cdc_extract", "word", "document.xml")
with open(p, encoding="utf-8") as f:
    xml = f.read()
text = re.sub(r"</w:p>", "\n", xml)
text = re.sub(r"<w:tab/>", "\t", text)
text = re.sub(r"<[^>]+>", "", text)
text = html.unescape(text)
out = os.path.join(base, "extracted.txt")
with open(out, "w", encoding="utf-8") as f:
    f.write(text)
print(len(text))

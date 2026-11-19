"""Export the design strategy and companion documents using native Word styles."""
from pathlib import Path
import argparse
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT

ROOT = Path(__file__).resolve().parents[1]
NAMES = {
    'pine-one-platform-design-strategy': 'Pine One Omni Platform Design Strategy',
    'pine-one-user-personas-and-behaviours': 'Pine One User Personas and Behaviour Reference',
    'pine-one-login-identity-design-document': 'Pine One Login and Identity Design Document',
    'pine-one-roles-permissions-design-document': 'Pine One Roles and Permissions Design Document',
    'pine-one-settlements-design-document': 'Pine One Settlements Design Document',
    'pine-one-refunds-design-document': 'Pine One Refunds Design Document',
    'pine-one-overview-design-document': 'Pine One Overview Design Document',
    'pine-one-transactions-design-document': 'Pine One Transactions Design Document',
    'pine-one-disputes-design-document': 'Pine One Disputes Design Document',
    'pine-one-reports-design-document': 'Pine One Reports Design Document',
    'pine-one-devices-design-document': 'Pine One Devices Design Document',
    'pine-one-stores-design-document': 'Pine One Stores Design Document',
    'pine-one-payment-links-design-document': 'Pine One Payment Links Design Document',
    'pine-one-checkout-design-document': 'Pine One Checkout Design Document',
    'pine-one-online-configuration-design-document': 'Pine One Online Payment Configuration Design Document',
    'pine-one-account-settings-design-document': 'Pine One Account Settings Design Document',
    'pine-one-support-design-document': 'Pine One Help and Support Design Document',
}

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--only', nargs='+', choices=NAMES, help='Export only the selected document stems')
parser.add_argument('--output-dir', type=Path, default=Path('/private/tmp/pine-one-design-export'))
args = parser.parse_args()

def inline(p, value):
    for part in re.split(r'(\*\*.*?\*\*)', value):
        r = p.add_run(part[2:-2] if part.startswith('**') else part)
        r.bold = part.startswith('**')

def table(doc, lines):
    rows = [[c.strip() for c in line.strip('|').split('|')] for line in lines]
    rows = [r for r in rows if not all(re.fullmatch(r':?-+:?', c) for c in r)]
    t = doc.add_table(rows=0, cols=len(rows[0]))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    t.autofit = False
    if len(rows[0]) == 2:
        widths = [2.15, 4.8]
    elif len(rows[0]) == 4 and rows[0][0] == 'ID':
        widths = [1.1, 1.3, 1.4, 3.15]
    elif len(rows[0]) == 4 and 'Primary references' in rows[0]:
        widths = [1.3, 1.85, 1.9, 1.9]
    elif len(rows[0]) == 4:
        widths = [1.25, 1.65, 2.05, 2.0]
    elif 'Priority' in rows[0] or 'Parent goal' in rows[0] or 'Platform link' in rows[0]:
        widths = [2.1, 3.85, 1.0]
    else:
        widths = [2.0, 2.55, 2.4]
    for col, width in zip(t.columns, widths):
        col.width = Inches(width)
    pr = t._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for side in ['top','left','bottom','right','insideH','insideV']:
        n = OxmlElement('w:'+side)
        for k,v in [('val','single'),('sz','4'),('color','D9D9D9')]: n.set(qn('w:'+k),v)
        borders.append(n)
    pr.append(borders)
    for ri, data in enumerate(rows):
        row = t.add_row()
        rp = row._tr.get_or_add_trPr()
        rp.append(OxmlElement('w:cantSplit'))
        if ri == 0: rp.append(OxmlElement('w:tblHeader'))
        for ci, value in enumerate(data):
            cell = row.cells[ci]
            cell.width = Inches(widths[ci])
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            cp = cell._tc.get_or_add_tcPr()
            mar = OxmlElement('w:tcMar')
            for s in ['top','left','bottom','right']:
                n=OxmlElement('w:'+s); n.set(qn('w:w'),'100'); n.set(qn('w:type'),'dxa'); mar.append(n)
            cp.append(mar)
            sh=OxmlElement('w:shd'); sh.set(qn('w:fill'),'E7EDF2' if ri==0 else ('F7F9FA' if ri%2==0 else 'FFFFFF')); cp.append(sh)
            p=cell.paragraphs[0]
            p.paragraph_format.space_after=Pt(0)
            p.paragraph_format.line_spacing=1.04
            inline(p,value)
            for r in p.runs:
                r.font.size=Pt(9.5)
                r.bold=ri==0 or r.bold
    doc.add_paragraph().paragraph_format.space_after=Pt(1)

for stem,title in NAMES.items():
    if args.only and stem not in args.only:
        continue
    doc=Document()
    sec=doc.sections[0]
    sec.page_width=Inches(8.5); sec.page_height=Inches(11)
    sec.top_margin=Inches(.65); sec.bottom_margin=Inches(.65)
    sec.left_margin=Inches(.775); sec.right_margin=Inches(.775)
    normal=doc.styles['Normal']
    normal.font.name='Arial'; normal.font.size=Pt(11)
    normal.font.color.rgb=RGBColor(0,0,0)
    normal.paragraph_format.space_after=Pt(5 if stem=='pine-one-module-design-template' else 7)
    normal.paragraph_format.line_spacing=1.08
    normal.paragraph_format.widow_control=True
    for name,size in [('Title',23),('Heading 1',16),('Heading 2',12)]:
        s=doc.styles[name]; s.font.name='Arial'; s.font.size=Pt(size)
        s.font.bold=True; s.font.color.rgb=RGBColor(0,0,0)
        s.paragraph_format.space_before=Pt(13 if name!='Title' else 0)
        s.paragraph_format.space_after=Pt(6)
        s.paragraph_format.keep_with_next=True
    lines=(ROOT/'docs/design'/f'{stem}.md').read_text().splitlines()
    i=0
    while i<len(lines):
        line=lines[i].strip()
        if not line: i+=1; continue
        if line.startswith('|'):
            block=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                block.append(lines[i].strip()); i+=1
            table(doc,block); continue
        if line.startswith('# '): p=doc.add_paragraph(line[2:],style='Title')
        elif line.startswith('## '): p=doc.add_paragraph(line[3:],style='Heading 1')
        elif line.startswith('### '): p=doc.add_paragraph(line[4:],style='Heading 2')
        elif line.startswith('- '):
            p=doc.add_paragraph(style='List Bullet'); inline(p,line[2:])
        else:
            p=doc.add_paragraph(); inline(p,line)
            if re.match(r'^\d+\. ',line):
                p.paragraph_format.left_indent=Inches(.2)
                p.paragraph_format.first_line_indent=Inches(-.2)
            if i<8 and stem!='pine-one-module-design-template':
                p.paragraph_format.space_after=Pt(2)
                for r in p.runs: r.font.size=Pt(9)
        i+=1
    doc.core_properties.title=title
    doc.core_properties.subject='Pine One merchant experience design'
    doc.core_properties.author=''
    dest=args.output_dir
    dest.mkdir(parents=True,exist_ok=True)
    doc.save(dest/f'{title}.docx')
    print(dest/f'{title}.docx')

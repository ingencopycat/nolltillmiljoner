"""Bounded subset of SEC inline XBRL for reviewed numeric evidence.

No taxonomy guessing: recipes select exact concepts, periods, units and dimensions.
Unsupported transforms, typed dimensions and conflicting duplicate values fail closed.
"""
from html.parser import HTMLParser
from decimal import Decimal, InvalidOperation
import re

class InlineFacts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.contexts={};self.units={};self.facts=[];self.context=None;self.unit=None;self.stack=[];self.capture=None;self.buffer=[];self.exclude=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs);local=tag.split(':')[-1]
        if local=='context':self.context={'id':a.get('id'),'dimensions':{}}
        elif local=='unit':self.unit={'id':a.get('id'),'measures':[]}
        elif local=='typedmember' and self.context is not None:self.context['unsupported']=True
        if self.context is not None and local in ('identifier','startdate','enddate','instant','explicitmember'):
            self.capture=(local,a);self.buffer=[]
        elif self.unit is not None and local=='measure':self.capture=(local,a);self.buffer=[]
        if tag=='ix:nonfraction':
            self.stack.append({'attributes':a,'text':[]})
        elif tag=='ix:exclude' and self.stack:self.exclude+=1
    def handle_data(self,data):
        if self.capture:self.buffer.append(data)
        if not self.exclude:
            for fact in self.stack:fact['text'].append(data)
    def handle_endtag(self,tag):
        local=tag.split(':')[-1]
        if self.capture and local==self.capture[0]:
            name,a=self.capture;text=''.join(self.buffer).strip()
            if name=='measure':self.unit['measures'].append(text)
            elif name=='explicitmember':self.context['dimensions'][a['dimension']]=text
            else:self.context[name]=text
            self.capture=None;self.buffer=[]
        if local=='context' and self.context is not None:
            if self.context['id'] in self.contexts and self.contexts[self.context['id']] != self.context:raise ValueError('Conflicting context identity')
            self.contexts[self.context['id']]=self.context;self.context=None
        if local=='unit' and self.unit is not None:
            if self.unit['id'] in self.units and self.units[self.unit['id']] != self.unit:raise ValueError('Conflicting unit identity')
            self.units[self.unit['id']]=self.unit;self.unit=None
        if tag=='ix:exclude' and self.stack:self.exclude=max(0,self.exclude-1)
        if tag=='ix:nonfraction' and self.stack:self.facts.append(self.stack.pop())


def numeric_facts(html):
    p=InlineFacts();p.feed(html);result=[]
    for raw in p.facts:
        a=raw['attributes'];context=p.contexts.get(a.get('contextref'));unit=p.units.get(a.get('unitref'))
        if not context or not unit or context.get('unsupported') or len(unit['measures'])!=1:continue
        if a.get('xsi:nil')=='true' or a.get('continuedat'):continue
        transform=a.get('format','').split(':')[-1].lower()
        if transform not in ('','num-dot-decimal','numdotdecimal','numdash','zerodash'):continue
        text=''.join(raw['text']).strip().replace(',','').replace('\u00a0','').replace(' ','')
        if text in ('—','–','-') and transform in ('numdash','zerodash','num-dot-decimal','numdotdecimal'):text='0'
        if not re.fullmatch(r'\d+(?:\.\d+)?',text):continue
        try:
            scale=int(a.get('scale','0'))
            if abs(scale)>12:continue
            value=Decimal(text)*(Decimal(10)**scale)
            if a.get('sign')=='-':value=-value
        except (InvalidOperation,ValueError):continue
        measure=unit['measures'][0];measure=measure.split(':')[-1]
        result.append(dict(concept=a['name'],unit=measure,start=context.get('startdate'),end=context.get('instant') or context.get('enddate'),dimensions=context['dimensions'],cik=context.get('identifier','').zfill(10),value=float(value),contextRef=a['contextref']))
    return result


def select_fact(facts, selector, cik):
    matches=[f for f in facts if f['cik']==cik and all(f.get(k)==selector.get(k) for k in ('concept','unit','start','end','dimensions'))]
    if not matches:raise ValueError('Reviewed XBRL fact unavailable or unsupported')
    values={f['value'] for f in matches}
    if len(values)!=1:raise ValueError('Conflicting duplicate XBRL facts')
    # Repeated renderings of the same fact are not separate economic observations.
    return {k:v for k,v in matches[0].items() if k!='contextRef'}

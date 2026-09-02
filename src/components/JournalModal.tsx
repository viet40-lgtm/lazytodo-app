import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { APP_COLORS, RADIUS, SPACING } from '../constants';

interface JournalEntry {
  id: string;
  date: string;
  thoughts: string;
  emotions: string;
  reflections: string;
  gratefulness: string;
  createdAt: number;
  updatedAt: number;
}

const SK = 'lazy_todo_journals_v1';

function todayKey() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2,'0');
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
}

function fmtDate(k: string) {
  const [y,m,d] = k.split('-').map(Number);
  return new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
}

function loadAll(): JournalEntry[] {
  try { if(typeof localStorage==='undefined') return []; const r=localStorage.getItem(SK); return r?JSON.parse(r):[]; }
  catch { return []; }
}

function saveAll(es: JournalEntry[]) {
  try { if(typeof localStorage!=='undefined') localStorage.setItem(SK,JSON.stringify(es)); } catch{}
}

export interface JournalModalProps { visible: boolean; onClose: () => void; }
type PV = 'list'|'edit';

export function JournalModal({visible,onClose}: JournalModalProps) {
  const [entries,setEntries]=useState<JournalEntry[]>([]);
  const [pv,setPv]=useState<PV>('edit');
  const [active,setActive]=useState<JournalEntry|null>(null);
  const [saved,setSaved]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{
    if(!visible) return;
    const all=loadAll(); setEntries(all); openToday(all);
  },[visible]);

  function openToday(all: JournalEntry[]) {
    const k=todayKey();
    const ex=all.find(e=>e.date===k);
    setActive(ex?{...ex}:{id:'j_'+Date.now(),date:k,thoughts:'',emotions:'',reflections:'',gratefulness:'',createdAt:Date.now(),updatedAt:Date.now()});
    setPv('edit');
  }

  function persist(entry: JournalEntry) {
    setEntries(prev=>{
      const i=prev.findIndex(e=>e.id===entry.id);
      const up=i>=0?prev.map((e,j)=>j===i?entry:e):[entry,...prev];
      saveAll(up); return up;
    });
    setSaved(true);
    if(timer.current) clearTimeout(timer.current);
    timer.current=setTimeout(()=>setSaved(false),1500);
  }

  function onChange(field: keyof Pick<JournalEntry,'thoughts'|'emotions'|'reflections'|'gratefulness'>,val:string) {
    if(!active) return;
    const up={...active,[field]:val,updatedAt:Date.now()};
    setActive(up);
    if(timer.current) clearTimeout(timer.current);
    timer.current=setTimeout(()=>persist(up),700);
  }

  function openEntry(e: JournalEntry){setActive({...e});setPv('edit');}

  function delEntry(id: string){
    setEntries(prev=>{const up=prev.filter(e=>e.id!==id);saveAll(up);return up;});
  }

  const isToday=active?.date===todayKey();

  return (
    <Modal visible={visible} animationType='slide' presentationStyle='fullScreen' onRequestClose={onClose}>
      <SafeAreaView style={s.screen}>
        <View style={s.header}>
          <View style={s.hLeft}>
            <Text style={s.title}>Journals</Text>
            {saved&&<Text style={s.badge}>Saved</Text>}
          </View>
          <View style={s.hRight}>
            <Pressable style={[s.tab,pv==='edit'&&s.tabOn]} onPress={()=>openToday(entries)}>
              <Text style={[s.tabTxt,pv==='edit'&&s.tabTxtOn]}>Today</Text>
            </Pressable>
            <Pressable style={[s.tab,pv==='list'&&s.tabOn]} onPress={()=>setPv('list')}>
              <Text style={[s.tabTxt,pv==='list'&&s.tabTxtOn]}>All</Text>
            </Pressable>
            <Pressable style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeX}>X</Text>
            </Pressable>
          </View>
        </View>

        {pv==='edit'&&active?(
          <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps='handled' showsVerticalScrollIndicator={false}>
            <Text style={s.dateLabel}>{isToday?'Today  ':''}{fmtDate(active.date)}</Text>
            <Sec label='Thoughts' ph='What is on your mind today?' val={active.thoughts} onCh={v=>onChange('thoughts',v)} />
            <Sec label='Emotions' ph='How are you feeling right now?' val={active.emotions} onCh={v=>onChange('emotions',v)} />
            <Sec label='Reflections' ph='What did you learn or notice today?' val={active.reflections} onCh={v=>onChange('reflections',v)} />
            <Sec label='Gratefulness' ph='What are you grateful for today?' val={active.gratefulness} onCh={v=>onChange('gratefulness',v)} />
          </ScrollView>
        ):null}

        {pv==='list'?(
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {entries.length===0?(
              <View style={s.empty}><Text style={s.emptyTxt}>No entries yet. Start writing today!</Text></View>
            ):(
              entries.slice().sort((a,b)=>b.createdAt-a.createdAt).map(e=>(
                <Pressable key={e.id} style={s.card} onPress={()=>openEntry(e)}>
                  <View style={s.cardRow}>
                    <Text style={s.cardDate}>{fmtDate(e.date)}</Text>
                    <Pressable style={s.delBtn} onPress={()=>delEntry(e.id)} hitSlop={8}>
                      <Text style={s.delTxt}>Delete</Text>
                    </Pressable>
                  </View>
                  {e.thoughts?<Text style={s.prev} numberOfLines={2}>{e.thoughts}</Text>:null}
                  {e.gratefulness?<Text style={s.prev} numberOfLines={1}>{e.gratefulness}</Text>:null}
                </Pressable>
              ))
            )}
          </ScrollView>
        ):null}
      </SafeAreaView>
    </Modal>
  );
}

interface SecP{label:string;ph:string;val:string;onCh:(v:string)=>void;}
function Sec({label,ph,val,onCh}:SecP){
  return(
    <View style={s.section}>
      <Text style={s.secLabel}>{label}</Text>
      <TextInput style={s.input} placeholder={ph} placeholderTextColor={APP_COLORS.textSubtle} multiline value={val} onChangeText={onCh} textAlignVertical='top'/>
    </View>
  );
}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:APP_COLORS.background},
  header:{backgroundColor:APP_COLORS.headerBg,padding:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  hLeft:{flexDirection:'row',alignItems:'center',gap:SPACING.md,flex:1},
  title:{fontSize:25,fontWeight:'800',color:'#fff'},
  badge:{fontSize:25,color:APP_COLORS.headerAccent,fontWeight:'600'},
  hRight:{flexDirection:'row',alignItems:'center',gap:SPACING.sm},
  tab:{paddingHorizontal:12,paddingVertical:10,borderRadius:999,borderWidth:1.5,borderColor:'rgba(255,255,255,0.3)'},
  tabOn:{backgroundColor:'rgba(134,239,172,0.2)',borderColor:APP_COLORS.headerAccent},
  tabTxt:{fontSize:25,fontWeight:'600',color:'rgba(255,255,255,0.6)'},
  tabTxtOn:{color:APP_COLORS.headerAccent,fontWeight:'800'},
  closeBtn:{padding:10,borderRadius:999,borderWidth:2,borderColor:'#fff',alignItems:'center',justifyContent:'center'},
  closeX:{fontSize:25,fontWeight:'800',color:'#fff'},
  content:{padding:13,gap:SPACING.xl,paddingBottom:40},
  dateLabel:{fontSize:25,fontWeight:'700',color:APP_COLORS.primary,marginBottom:SPACING.xs},
  section:{gap:SPACING.sm},
  secLabel:{fontSize:25,fontWeight:'800',color:APP_COLORS.text},
  input:{backgroundColor:APP_COLORS.surface,borderRadius:14,borderWidth:1.5,borderColor:APP_COLORS.border,padding:SPACING.md,fontSize:25,color:APP_COLORS.text,minHeight:100},
  empty:{alignItems:'center',paddingTop:60,gap:SPACING.md},
  emptyTxt:{fontSize:25,color:APP_COLORS.textMuted,textAlign:'center',lineHeight:34},
  card:{backgroundColor:APP_COLORS.surface,borderRadius:14,padding:SPACING.lg,gap:SPACING.sm,borderWidth:1,borderColor:APP_COLORS.border},
  cardRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  cardDate:{fontSize:25,fontWeight:'700',color:APP_COLORS.primary,flex:1},
  delBtn:{padding:6},
  delTxt:{fontSize:25,color:APP_COLORS.delete,fontWeight:'700'},
  prev:{fontSize:25,color:APP_COLORS.textMuted,lineHeight:30},
});
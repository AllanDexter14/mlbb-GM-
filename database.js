const TEAM_DB = {
  PH: [
    { name: "Team Liquid PH", p: [["Sanford","EXP"],["KarlTzy","JG"],["Sanji","MID"],["Teddy","GOLD"],["Jaypee","ROAM"]], b: [["Daiki","GOLD"]] },
    { name: "Team Falcons PH", p: [["Flap","EXP"],["Kyle","JG"],["Hadji","MID"],["Super Marco","GOLD"],["Owgwen","ROAM"]], b: [["Ferdz","EXP"]] },
    { name: "ONIC Philippines", p: [["Kirk","EXP"],["K1NGKONG","JG"],["Super Frince","MID"],["Savero","GOLD"],["Super Yoshi","ROAM"]], b: [["Dann","EXP"],["Brusko","ROAM"]] },
    { name: "Omega Esports", p: [["Louis","EXP"],["Raizen","JG"],["Minguin","MID"],["Cull","GOLD"],["Perkziva","ROAM"]], b: [["Peuder","FLEX"]] },
    { name: "Aurora Gaming PH", p: [["Nathzz","EXP"],["Koyl","JG"],["Yue","MID"],["Domeng","GOLD"],["Light","ROAM"]], b: [["Yecs","FLEX"]] },
    { name: "Twisted Minds PH", p: [["Lansu","EXP"],["Sensu1","JG"],["Sionnn","MID"],["Bennyqt","GOLD"],["Tracy","ROAM"]], b: [["Kurtt","MID"]] },
    { name: "AP.Bren", p: [["JMPINKMAN","EXP"],["Jamespangks","JG"],["LanceCy","MID"],["Shizou","GOLD"],["Escalera","ROAM"]], b: [["Allen","EXP"], ["SpiderMilez", "ROAM"]] },
    { name: "TNC Pro Team", p: [["Ryota","EXP"],["Zaida","JG"],["Vin","MID"],["Jowm","GOLD"],["Zehn","ROAM"]], b: [["Yeyeniya","FLEX"]] },
  ],

  ID: [
    { name: "Bigetron by Vitality", p: [["Shogun","EXP"],["Nnael","JG"],["Moreno","MID"],["EMANN","GOLD"],["Finn","ROAM"]], b: [["Miguel","FLEX"]] },
    { name: "ONIC", p: [["Lutpiii","EXP"],["Kairi","JG"],["S A N Z","MID"],["Kelra","GOLD"],["Kiboy","ROAM"]], b: [["SamueL","ROAM"]] },
    { name: "Geek Fam ID", p: [["MarceL","EXP"],["Nazara","JG"],["A B O Y","MID"],["KennzyySkie","GOLD"],["AudyTzy","ROAM"]], b: [["Febriii","EXP"]] },
    { name: "Team Liquid ID", p: [["Aran","EXP"],["Kevin","JG"],["Drichel","MID"],["Keven","GOLD"],["Lyoni","ROAM"]], b: [["Anaver","MID"]] },
    { name: "EVOS", p: [["Rendyy","EXP"],["Alberttt","JG"],["DrianW","MID"],["Erlan","GOLD"],["Muezza","ROAM"]], b: [["Vell","EXP"],["Ryzaa","MID"]] },
    { name: "Dewa United Esports", p: [["QINN","EXP"],["Kayn","JG"],["Octa","MID"],["Maybeee","GOLD"],["Itoshi Kesu","ROAM"]], b: [["RuL Good","FLEX"]] },
    { name: "Alter Ego", p: [["Nino","EXP"],["Affan","JG"],["Dalvin","MID"],["Dingarai","GOLD"],["Alexander","ROAM"]], b: [["Reyy","JG"],["Halim","MID"],["Ivann","ROAM"]] },
    { name: "Natus Vincere", p: [["Karss","EXP"],["Andoryuuu","JG"],["Jiizee","MID"],["Zeonn","GOLD"],["APHRO","ROAM"]], b: [["Febbb","EXP"],["Joshua","JG"]] },
    { name: "RRQ Hoshi", p: [["Joshua","EXP"],["Demonkite","JG"],["Hajirin","MID"],["Arthur","GOLD"],["Said","ROAM"]], b: [["Clayyy","MID"],["Habil","GOLD"]] }
  ],

  MY: [
    // Estimated starting roles except where verified by team/player sources.
    { name: "AC Esports", p: [["Momo","EXP"],["Zahyed","JG"],["Izanami","MID"],["Nets","GOLD"],["Reyzar","ROAM"]], b: [["Martzy","FLEX"]] },
    { name: "Bigetron MY by VIT", p: [["Jeymz","EXP"],["Chibi","JG"],["Zieyy","MID"],["Ciku","GOLD"],["GRBoy","ROAM"]], b: [["Amzziq","FLEX"]] },
    { name: "Team Flash", p: [["3Mar","EXP"],["Garyy","JG"],["UK1R","MID"],["Vanix","GOLD"],["Xorn","ROAM"]], b: [["Osker","FLEX"]] },
    { name: "Invictus Gaming", p: [["Ye3","EXP"],["Lunnn","JG"],["Treacky","MID"],["Rokji","GOLD"],["Atannn","ROAM"]], b: [["Rezza","FLEX"]] },
    { name: "RRQ Tora", p: [["LEHTzy","EXP"],["Super Kenn","JG"],["Yehezkiel","MID"],["Loleal","GOLD"],["Addboy","ROAM"]], b: [["AJ","MID"],["Izzshiki","GOLD"]] },
    { name: "Selangor Red Giants", p: [["Yums","EXP"],["Sekysss","JG"],["Stormie","MID"],["Innocent","GOLD"],["Kramm","ROAM"]], b: [["Unii","EXP"]] },
    { name: "Team Rey", p: [["Smooth","EXP"],["Dolynn","JG"],["Kyym","MID"],["Cliveee","GOLD"],["NovaXcobar","ROAM"]], b: [["JWen","FLEX"]] },
    { name: "Team Vamos", p: [["Sizkaa","EXP"],["Error 404","JG"],["EyyMal","MID"],["Natco","GOLD"],["Claw Kun","ROAM"]], b: [["Zqeef","FLEX"],["Sepat","FLEX"]] }
  ],

  KH: [
    { name: "Evil Eye Esports", p: [["Nelshy","EXP"],["Hyunn","JG"],["Crimson","MID"],["Venlyy","GOLD"],["KTANK SOCUTE","ROAM"]], b: [["Ruku","FLEX"]] },
    { name: "Galaxy Legends", p: [["Eldraa","EXP"],["Linnn","JG"],["Runnn","MID"],["Wickyyy","GOLD"],["Darkside","ROAM"]], b: [["Bun Long","FLEX"]] },
    { name: "Vigor Apex", p: [["Shadoww","EXP"],["Detective","JG"],["Raa","MID"],["Vincen","GOLD"],["D7","ROAM"]], b: [["Chheop","FLEX"],["BOXI","FLEX"]] },
    { name: "Valhalla", p: [["Wadu","EXP"],["Flick","JG"],["Naja","MID"],["Nosia","GOLD"],["SECRET","ROAM"]], b: [["Zee x3","FLEX"],["Nelson","FLEX"]] },
    { name: "Team Flash KH", p: [["Aries","EXP"],["Sakzuuu","JG"],["Oppi","MID"],["Layy","GOLD"],["Cypher","ROAM"]], b: [["Ravenn","EXP"]] },
    { name: "See You Soon", p: [["Cyaan","EXP"],["CHMA","JG"],["BiiMo The Key","MID"],["Nhazz1","GOLD"],["Sugar","ROAM"]], b: [["Nezy","FLEX"]] },
    { name: "Team RVZ", p: [["Nero","EXP"],["VBEN","JG"],["Souur","MID"],["Kwayne","GOLD"],["Hero","ROAM"]], b: [["Kanhori","FLEX"]] },
    { name: "TNR Esports", p: [["Mercyy","EXP"],["Nether","JG"],["Remy","MID"],["Kaishi","GOLD"],["Tyyy","ROAM"]], b: [["Romeooo","FLEX"],["Kenskieee","FLEX"]] },
    { name: "PRO Esports", p: [["SryImFelix","EXP"],["MP the King","JG"],["SAA","MID"],["Outplayed","GOLD"],["PPPPP","ROAM"]], b: [["EZ","FLEX"]] },

    // Provisional: third-party sources list this lineup as Galaxy Phoenix.
    { name: "Queen Phoenix", p: [["Lingg","EXP"],["Fahh","JG"],["Sofia","MID"],["Yingg","GOLD"],["Lemaa","ROAM"]], b: [["Winnie","FLEX"],["Chincaaw","FLEX"]] }
  ]
  
};

const PLAYER_FORM = {

  // =================================
  // MPL PH - SEASON 18
  // =================================

  // TEAM LIQUID PH
  Sanford:       { mec:87, mac:89, tf:90, con:89 },
  KarlTzy:       { mec:95, mac:92, tf:94, con:93 },
  Sanji:         { mec:87, mac:91, tf:89, con:88 },
  Teddy:         { mec:91, mac:87, tf:91, con:92 },
  Jaypee:        { mec:79, mac:91, tf:94, con:91 },
  Daiki:         { mec:76, mac:79, tf:80, con:77 },

  // TEAM FALCONS PH
  Flap:          { mec:85, mac:88, tf:89, con:87 },
  Kyle:          { mec:92, mac:87, tf:89, con:88 },
  Hadji:         { mec:91, mac:91, tf:91, con:89 },
  "Super Marco": { mec:94, mac:90, tf:94, con:93 },
  Owgwen:        { mec:80, mac:88, tf:92, con:89 },
  Ferdz:         { mec:75, mac:79, tf:80, con:77 },

  // ONIC PH
  Kirk:          { mec:81, mac:85, tf:83, con:82 },
  K1NGKONG:      { mec:93, mac:89, tf:91, con:90 },
  "Super Frince":{ mec:89, mac:92, tf:91, con:90 },
  Savero:        { mec:89, mac:85, tf:87, con:86 },
  "Super Yoshi": { mec:76, mac:87, tf:91, con:86 },
  Dann:          { mec:74, mac:77, tf:78, con:75 },
  Brusko:        { mec:82, mac:85, tf:88, con:84 },

  // OMEGA ESPORTS
  Louis:         { mec:81, mac:83, tf:84, con:82 },
  Raizen:        { mec:86, mac:83, tf:86, con:85 },
  Minguin:       { mec:85, mac:88, tf:89, con:86 },
  Cull:          { mec:84, mac:81, tf:84, con:82 },
  Perkziva:      { mec:77, mac:85, tf:88, con:84 },
  Peuder:        { mec:78, mac:80, tf:81, con:79 },

  // AURORA GAMING PH
  Nathzz:        { mec:87, mac:87, tf:88, con:87 },
  Koyl:          { mec:85, mac:83, tf:86, con:84 },
  Yue:           { mec:92, mac:93, tf:93, con:92 },
  Domeng:        { mec:87, mac:84, tf:88, con:86 },
  Light:         { mec:80, mac:89, tf:92, con:89 },
  Yecs:          { mec:78, mac:83, tf:84, con:81 },

  // TWISTED MINDS PH
  Lansu:         { mec:79, mac:81, tf:82, con:78 },
  Sensu1:        { mec:83, mac:80, tf:82, con:80 },
  Sionnn:        { mec:81, mac:84, tf:85, con:81 },
  Bennyqt:       { mec:91, mac:88, tf:90, con:89 },
  Tracy:         { mec:76, mac:83, tf:86, con:81 },
  Kurtt:         { mec:77, mac:80, tf:81, con:78 },

  // AP.BREN
  JMPINKMAN:     { mec:82, mac:83, tf:84, con:82 },
  Jamespangks:   { mec:85, mac:83, tf:86, con:84 },
  LanceCy:       { mec:84, mac:86, tf:86, con:84 },
  Shizou:        { mec:85, mac:81, tf:84, con:82 },
  Escalera:      { mec:77, mac:85, tf:88, con:83 },
  Allen:         { mec:75, mac:78, tf:79, con:76 },
  SpiderMilez:   { mec:83, mac:86, tf:90, con:85 },

  // TNC PRO TEAM
  Ryota:         { mec:79, mac:81, tf:82, con:80 },
  Zaida:         { mec:89, mac:85, tf:87, con:86 },
  Vin:           { mec:81, mac:84, tf:85, con:83 },
  Jowm:          { mec:83, mac:80, tf:82, con:80 },
  Zehn:          { mec:75, mac:82, tf:86, con:81 },
  Yeyeniya:      { mec:76, mac:79, tf:80, con:77 },


  // MPL ID - Season 18
  "Nnael":         { mec: 96, mac: 93, tf: 92, con: 93 },
  "Kevin":         { mec: 96, mac: 91, tf: 92, con: 91 },
  "Kairi":         { mec: 97, mac: 96, tf: 95, con: 94 },
  "Kelra":         { mec: 96, mac: 92, tf: 94, con: 93 },
  "Kiboy":         { mec: 87, mac: 94, tf: 97, con: 92 },
  "Dingarai":      { mec: 97, mac: 92, tf: 95, con: 94 },
  "Dalvin":        { mec: 92, mac: 94, tf: 96, con: 93 },
  "Alexander":     { mec: 85, mac: 93, tf: 97, con: 92 },
  "Affan":         { mec: 95, mac: 91, tf: 94, con: 92 },
  "Zeonn":         { mec: 95, mac: 96, tf: 96, con: 97 },
  "Jiizee":        { mec: 94, mac: 95, tf: 97, con: 96 },
  "Joshua":        { mec: 97, mac: 94, tf: 95, con: 96 },
  "Drichel":       { mec: 88, mac: 94, tf: 96, con: 94 },
  "Keven":         { mec: 94, mac: 92, tf: 94, con: 94 },
  "Lyoni":         { mec: 83, mac: 94, tf: 98, con: 91 },
  "SANZ":          { mec: 93, mac: 95, tf: 94, con: 94 },
  "Nino":          { mec: 92, mac: 93, tf: 94, con: 91 },
  "APHRO":         { mec: 84, mac: 92, tf: 96, con: 91 },
    "A B O Y":       { mec: 90, mac: 92, tf: 93, con: 91 },

  // MPL MY - Season 18
  "Stormie":       { mec: 94, mac: 96, tf: 97, con: 96 },
  "Innocent":      { mec: 96, mac: 92, tf: 94, con: 96 },
  "Sekysss":       { mec: 95, mac: 92, tf: 94, con: 92 },
  "Yums":          { mec: 82, mac: 95, tf: 98, con: 91 },
  "Kramm":         { mec: 88, mac: 93, tf: 96, con: 92 },
  "Claw Kun":      { mec: 84, mac: 94, tf: 97, con: 98 },
  "Natco":         { mec: 94, mac: 91, tf: 93, con: 92 },
  "Error 404":     { mec: 95, mac: 90, tf: 93, con: 91 },
  "Sizkaa":        { mec: 87, mac: 90, tf: 93, con: 87 },
  "Cliveee":       { mec: 94, mac: 93, tf: 96, con: 95 },
  "Vanix":         { mec: 91, mac: 90, tf: 92, con: 89 },

  // MPL KH - Season 11
  "Detective":     { mec: 94, mac: 93, tf: 94, con: 93 },
  "Shadoww":       { mec: 91, mac: 92, tf: 93, con: 90 },
  "Raa":           { mec: 92, mac: 94, tf: 93, con: 91 },
  "Vincen":        { mec: 92, mac: 90, tf: 92, con: 90 },
  "D7":            { mec: 85, mac: 92, tf: 95, con: 91 },
  "Flick":         { mec: 95, mac: 91, tf: 93, con: 92 },
  "Wickyyy":       { mec: 92, mac: 90, tf: 93, con: 90 },
  "Aries":         { mec: 90, mac: 92, tf: 94, con: 91 },
  "Oppi":          { mec: 91, mac: 93, tf: 94, con: 91 },
  "Layy":          { mec: 93, mac: 89, tf: 91, con: 90 },
  "Cypher":        { mec: 85, mac: 91, tf: 95, con: 90 }
};
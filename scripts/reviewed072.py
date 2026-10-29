"""Build reviewed route records from retained official guide evidence, offline.

Numbers below were checked in the retained guides. The basis is published, not
converted to round-trip. Source keys distinguish named routes on shared guides.
"""
import json,re,hashlib
from pathlib import Path
from compile import E,ROOT,slug

# name | miles (blank = unknown) | published basis | difficulty | specific context | tags
REVIEWED={
'colm':"""Window Rock Trail|0.25|one way|Easy|Pinyon-juniper woodland leads to views of Monument and Wedding Canyons and Independence Monument.|forest,overlook,geology
Canyon Rim Trail|0.5|one way|Easy|The cliff-edge route above Wedding Canyon connects Saddlehorn Visitor Center and Book Cliffs View.|overlook,geology
Alcove Nature Trail|0.5|one way|Mostly level|A box-canyon alcove introduces the monument's plants, animals and rocks. The source describes assistance up to the overlook.|geology
Otto's Trail|0.5|one way|Easy|Woodlands open to views of Sentinel Spire, Pipe Organ, Praying Hands and Independence Monument.|forest,overlook,geology
Coke Ovens Trail|0.5|one way|Easy|A descending hillside route reaches an overlook of rounded Wingate Sandstone formations shaped by weathering.|geology,overlook
CCC Trail|0.75|one way|Moderate|This ascending connection links Black Ridge Trail with Monument Canyon Trail.||
Devils Kitchen Trail|0.75|one way|Moderate|Carved slickrock steps lead toward the natural opening enclosed by tall upright boulders.|geology
Serpents Trail|1.9|one way|Steep, moderate hike|Sixteen switchbacks follow a historic early-twentieth-century road through Wingate Sandstone.|historic,geology
Echo Canyon Trail||conflicting miles and kilometres|Moderate|The route leaves Old Gordon Trail for a shady canyon and a seasonal pool beneath cottonwoods; poison ivy is noted near the canyon head.|forest""",
'cavo':"""Crater Rim Trail|1|loop|Moderately difficult|A paved circuit on the volcanic rim has steep climbs and descents and interprets the Raton-Clayton Volcanic Field.|geology
Crater Vent Trail|0.2|one way||The paved descent reaches the bottom of Capulin's crater; the source reports a 100-foot elevation change.|geology
Lava Flow Trail|1|loop||An unimproved circuit at the base crosses a lava flow and offers views of volcanic topography.|geology
Boca Trail|2|loop|Strenuous|This unimproved circuit explores the vent area from which Capulin's lava flows originated.|geology
Nature Trail||not published||A figure-eight sidewalk beside the visitor center interprets plants, wildlife and geology around a volcanic squeeze-up.|geology""",
'chcu':"""Wijiji Trail|3.8|round trip||The shortest of Chaco's four backcountry hikes explores the wider Chacoan landscape beyond the loop road.|historic
South Mesa Trail|4.5|approximately; loop||This backcountry loop begins at the Casa Rinconada parking area and explores the mesa landscape.|historic
Pueblo Alto Trail|5.5|loop||A mesa-top loop offers an elevated view of Pueblo Bonito and context for Chacoan great houses and roads.|historic,overlook
Peñasco Blanco Trail|7.5|round trip||The longest of the four backcountry hikes presents the scale of Chaco's great-house and road landscape.|historic""",
'apco':"""Coleman House Trail|0.6|one way|Easy|The wooded route reaches the Coleman House site, where enslaved Hannah Reynolds received the wound that killed her during the battle.|historic,forest
Conner-Sweeney Cabin Trail|0.5|one way|Easy|Fields and woodland provide views of the Conner-Sweeney Cabin, with a possible connection to the Sweeney Trail.|historic,forest
Ferguson Wildlife Trail|0.9|loop|Easy|Interpretive stops describe habitats around Ferguson field, managed for native pollinators and grassland birds.||
Grant’s Approach Trail|1.4|loop|Easy|Historic Sears Lane and monuments interpret the route Grant traveled toward his meeting with Lee.|historic,forest
Lee’s Headquarters Trail|0.3|loop|Easy|A short wooded route reaches the marker for Lee's headquarters; roots and rocks remain on the tread.|historic,forest
Southside Connector Trail|2.4|one way|Moderate|Rolling wooded terrain connects Grant's Approach and Tobacco Prizery trails; rocky tread and flood-prone sections require care.|forest
Stage Road Trail|0.9|one way|Easy|The historic Lynchburg-Richmond Stage Road crosses the village toward the Appomattox River.|historic
Sweeney Trail|1|one way|Easy|Open fields connect the Artillery Park, Charles Sweeney Cabin, Sweeney Cemetery and Conner House site.|historic
Tibbs Trail|1.3|one way|Easy|Field and forest link the Confederate Cemetery and Appomattox Wayside; the route can combine with Stage Road.|historic,forest
Tobacco Prizery Nature Trail|1.2|loop|Easy|Interpretation identifies trees and changes in land use; uneven ground and two stair sets have no handrails.|historic,forest
USCT Approach Trail|1.2|loop|Easy|Open fields trace the approach of United States Colored Troops who helped block the Confederate escape route on April 9, 1865.|historic""",
'anti':"""Antietam Remembered|0.25|loop||A paved walkway links landmarks near the visitor center, including Dunker Church and the Maryland State Monument.|historic
Bloody Lane Trail|1.6|loop||The route crosses the historic Mumma and Roulette Farms toward the Confederate position at the Sunken Road.|historic
Cornfield Trail|1.25|loop||Starting at Auto Tour Stop 4, the loop interprets the battlefield's early morning fighting.|historic
Final Attack Trail|1.7|loop||From Auto Tour Stop 8, this walk follows fields of the final Union advance and Confederate counterattack.|historic
Sherrick Farm Trail|1.3|one way||Farm fields and woodlots lead toward Burnside Bridge; use care crossing modern Burnside Bridge Road.|historic,forest
Snavely Ford Trail|1.8|loop||Much of this shady loop follows Antietam Creek, with an uphill climb near the end.|historic
Three Farms Trail|1.6|one way||This connection links the northern Bloody Lane Trail to the southern Sherrick Farm Trail.|historic
Tidball Trail|0.3|one way||The route begins at Newcomer House and reaches a battlefield overlook near the Union Fifth Corps crossing.|historic,overlook
Union Advance Trail|1|loop||The walk crosses Burnside Bridge to examine Confederate defenses and Union Ninth Corps approaches.|historic
West Woods Trail|0.9|loop||A mostly shaded circuit from Auto Tour Stop 5 explores key locations of fighting in the West Woods.|historic,forest""",
'labe':"""Heppe Cave Trail|0.4|one way||Ponderosa pines, mountain mahogany and juniper lead toward a large lava-tube collapse and Heppe Ice Cave.|forest,geology
Gillem Bluff Trail|0.7|one way||The climb reaches the top of Gillem Bluff with expansive landscape views.|overlook
Schonchin Butte Trail|0.7|one way||A climb up a cinder cone reaches a historic fire lookout structure and views over the basin.|geology,historic,overlook
Missing Link Trail|0.7|one way||This connection joins the Three Sisters and Bunchgrass routes and can form part of a longer loop.||
Symbol Bridge Trail|0.8|one way||Lava-tube collapses and pictographs are visible near Symbol Bridge Cave and Big Painted Cave.|geology,historic
Bunchgrass Trail|1|one way||Open brushlands and juniper thickets connect the campground to Bunchgrass overlook.|overlook
Thomas-Wright Battlefield Trail|1.1|one way||Interpretation connects Modoc War history with examples of volcanism; wildflowers are described for late spring and early summer.|historic,geology
Black Crater Trail||typographic conflict in published mileage||A spur from Thomas-Wright Battlefield Trail reaches a spatter cone and lava tree molds.|geology
Big Nasty Trail|2|loop||Rough lava, crater-rim views and ponderosa forests characterize a loop near Mammoth Crater and Hidden Valley.|geology,forest,overlook
Whitney Butte Trail|3.3|one way||The route curves around Whitney Butte toward the western wilderness boundary, with views of Mount Shasta and Callahan Lava Flow.|overlook,geology
Three Sisters Trail|8.7|one way||Collapsed lava-tube trenches thread through juniper and sagebrush wilderness; connecting routes form a longer loop.|geology
Lyons Trail|9.4|one way||A former monument road crosses much of the park from north to south through wilderness.||""",
'wica':"""Prairie Vista|1|approximately; round trip|Easy|Waysides interpret prairie grasslands on a loop starting near the visitor center.||
Elk Mountain|1|round trip|Easy|A campground loop follows the meeting of grassland and forest; elk bugling may be heard in autumn.|forest
Rankin Ridge|1|round trip|Easy|A nature loop reaches the park's highest point and distant views; the fire tower itself is closed.|overlook
Wind Cave Canyon|1.8|one way|Easy|A former road follows limestone cliffs and forested hillsides toward the park boundary.|geology,forest
Cold Brook Canyon||inconsistent miles and kilometres|Moderate|Ponderosa forest gives way to prairie and a prairie-dog town along the canyon.|forest
Lookout Point|2.2|one way|Moderate|Rolling prairie descends toward Beaver Creek and connects to longer loop options.|overlook
East Bison Flats|3.7|one way|Strenuous|A steep climb from Wind Cave Canyon leads into rolling prairie and views of Buffalo Gap and the Black Hills.|overlook
Sanctuary|3.6|one way|Strenuous|Rolling prairie and a large prairie-dog town lead toward the Highland Creek junction.||
Centennial|6|park segment; one way|Strenuous|This park segment forms part of the much longer Black Hills Centennial Trail, crossing prairie, pine forest and Beaver Creek.|forest
Highland Creek|8.6|one way|Strenuous|The park's longest trail crosses mixed-grass prairie, ponderosa forest and riparian habitats.|forest
Boland Ridge|2.6|one way|Strenuous|A succession of climbs affords Black Hills, Red Valley and prairie panoramas.|overlook""",
'bica':"""Beaver Pond Nature Trail|2.6|round trip|Moderate|This named trail is in the Fort Smith North District, listed separately from the Lovell routes.||
Bighorn Head Gate|0.1|round trip|Easy|A short North District route is listed in the official Bighorn Canyon hiking guide.||
Three Mile Access|2|round trip|Easy|This Fort Smith North District hike is distinct from the longer South District routes.||
Visitor Center Pond|0.26|round trip|Easy|A short Lovell South District walk is identified by the official guide as accessible; suitability requires checking current information.||
Sykes Mountain Trail|4.6|round trip|Hard|This Lovell South District mountain route has a hard rating in the official guide.||
Mouth of the Canyon Trail|1.8|round trip|Moderate|This South District route is named for the mouth of Bighorn Canyon.||
State Line Trail|1.52|round trip|Easy to Moderate|This South District route has a mixed easy-to-moderate rating in the park guide.||
Ranger Delight|0.66|published as round; return basis not further specified|Easy to Moderate|A short South District route is listed with a mixed rating.||
Sullivan's Knob Trail|0.75|round trip|Easy to Moderate|The official hiking guide lists this named route in the Lovell South District.||
Two Eagles Interpretive Trail|0.25|round trip|Easy|The guide identifies an accessible interpretive route in the Lovell South District.|historic
Lower Layout Creek Trail|3.4|round trip|Easy to Moderate|The Lower Layout Creek route is separately listed from the shorter but harder Upper Layout Creek hike.||
Upper Layout Creek Trail|1.8|round trip|Hard|This Upper Layout Creek route has a hard rating, distinct from the longer Lower Layout Creek hike.||
Barry's Island Trail|4|round trip|Moderate|The park hiking guide lists this island route in the Lovell South District.||""",
'hove':"""Paved Path to Canyon Overlook|0.32|round trip||The path from the visitor center reaches views of Square Tower Group structures and native-plant interpretation.|historic,overlook
Square Tower Loop Trail|2|round trip; loop||Primitive slickrock and packed dirt circle ancestral Puebloan structures, with a steep canyon crossing.|historic,geology
Hovenweep Castle Hike (Out-and-Back)|0.82|round trip||A shorter route from Canyon Overlook uses the Square Tower Loop to view Hovenweep Castle and nearby structures.|historic
Horseshoe and Hackberry Trail (Out-and-Back)|1.44|round trip||Packed dirt, sandy wash and slickrock connect Horseshoe House and the larger Hackberry sacred site.|historic
Hiking at Holly (Out-and-Back hike from Holly parking area)|0.44|round trip||The primitive route passes Holly Tower and Holly House and ends at a petroglyph panel beneath an overhang.|historic
Hiking to Holly (Out-and-Back hike from campground)|7|round trip||The Keely Canyon route passes narrow boulder slots and partly crosses Bureau of Land Management land on its way to Holly.|historic
Hiking at Cajon (Out-and-Back)|0.2|round trip||A mostly flat slickrock path winds around ancestral structures with broad canyon-country views.|historic,overlook""",
}

def main():
 evidence=json.loads((E/'acquired072.json').read_text());parks=json.loads((ROOT/'src/data/parks.json').read_text())['units'];out={'parks':{}}
 for code,rows in REVIEWED.items():
  url,page=next((u,p) for u,p in evidence.items() if '/'+code+'/' in u)
  park=next(p for p in parks if p['parkCode']==code)
  body=page['text']+' '+ ' '.join(r for t in page['tables'] for r in t)
  values=[]
  for row in rows.splitlines():
   name,length,basis,difficulty,description,tags,*_=row.split('|')
   assert name in body,(code,name)
   value=dict(name=name,kind='trail',source=url,sourceKey=slug(name),description=description,retrievedAt=page['retrievedAt'],verificationStatus='official-source',evidence={'name':name,'measurementBasis':basis,'retainedGuide':url})
   if length:value['length']=dict(value=float(length),unit='mi',method=basis)
   if difficulty:value['difficulty']=difficulty
   if 'loop' in basis:value['routeType']='loop'
   if 'Out-and-Back' in name:value['routeType']='out-and-back'
   if tags:value['tags']=tags.split(',')
   if not length and ('conflict' in basis or 'inconsistent' in basis):value['conflicts']=[dict(field='length',detail='Numeric length withheld: '+basis+'. See the official guide; no correction or conversion was imposed.',sources=[url])]
   if code=='chcu':value['permitNotes']='The source requires each backcountry hiking group to sign in at its trailhead. Check current official requirements.'
   if code=='hove':value['seasonalNotes']='Trails are described as daylight-only; remain on designated paths and do not enter structures.'
   if code=='cavo' and name=='Nature Trail':value['accessibility']='NPS describes this figure-eight sidewalk as accessible. Paving alone is not used as proof of accessibility.'
   if code=='colm' and name=='Alcove Nature Trail':value['accessibility']='NPS describes access with assistance up to the overlook; this does not establish independent wheelchair suitability.'
   if code=='bica' and name in ['Visitor Center Pond','Two Eagles Interpretive Trail']:value['accessibility']='The official guide labels this route accessible; detailed slope, surface and assistance requirements are not provided.'
   values.append(value)
  out['parks'][park['id']]={'attractions':values}
 (E/'release072-trails.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 print('Reviewed trails:',sum(len(p['attractions']) for p in out['parks'].values()))
if __name__=='__main__':main()

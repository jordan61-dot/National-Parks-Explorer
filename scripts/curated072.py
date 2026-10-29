"""Reviewed unit-specific summaries, features and route reconciliation."""
import json,re
from compile import ROOT,E,slug
def main():
 parks=json.loads((ROOT/'src/data/parks.json').read_text())['units'];byid={p['id']:p for p in parks};out={'parks':{}}
 sources={}
 for filename in ['acquired072.json','acquired072-extra.json','follow072.json']:
  sources.update(json.loads((E/filename).read_text()))
 def unit(ident):
  p=byid.get(ident) or next(p for p in parks if p['parkCode']==ident)
  return out['parks'].setdefault(p['id'],{})
 def proof(url):
  p=sources[url];assert p.get('text') and p.get('retrievedAt'),url
  return p['retrievedAt']
 def intro(ident,url,text):unit(ident).update(description=text,source=url,retrievedAt=proof(url))
 def article(ident,url,topic,title,text):
  unit(ident).setdefault('articles',[]).append(dict(topic=topic,title=title,text=text,source=url,retrievedAt=proof(url),contentKind='summary'))
 def feature(ident,url,name,kind,description,**fields):
  unit(ident).setdefault('attractions',[]).append(dict(name=name,kind=kind,description=description,source=url,sourceKey=slug(name),retrievedAt=proof(url),evidence={'retainedSource':url,'name':name},verificationStatus='official-source',**fields))
 def history(ident,url,date,kind,event):unit(ident).setdefault('history',[]).append(dict(date=date,kind=kind,event=event,source=url,retrievedAt=proof(url)))
 schools='https://www.nps.gov/orgs/1207/011725-brownvboardofeducationaffiliated-areas.htm'
 foundation='https://www.nps.gov/brvb/learn/management/brown-v-board-of-education-nhp-foundation-document.htm'
 for ident,text in {
 'claymont-community-center':'The former Claymont High School in Delaware is associated with the school-desegregation litigation incorporated into Brown v. Board of Education. Twelve Black students legally entered the school in September 1952. The building now serves as Claymont Community Center and remains an affiliated area in local ownership.',
 'howard-high-school-of-technology':'Howard High School in Wilmington was, for decades, Delaware’s only secondary school for Black students. Parents’ efforts to obtain access to the nearer all-white Claymont High School became Belton v. Gebhart. The historic building remains an active school and a separately classified affiliated area.',
 'hockessin-colored-school-107':'This Delaware school was central to Bulah v. Gebhart, one of the cases associated with the Brown v. Board of Education decision. The historic school is preserved by Friends of Hockessin Colored School #107, with its affiliated-area role focused on the history of unequal schooling and desegregation.',
 'john-philip-sousa-middle-school':'Built in 1950 in Southeast Washington, D.C., the former Sousa Junior High School denied admission to Black students, leading to Bolling v. Sharpe. The historic building remains in use as a public school; its affiliated-area status interprets the struggle against school segregation.',
 'robert-russa-moton-museum':'The former Robert Russa Moton High School in Farmville, Virginia, connects a student-led challenge to segregated education with the cases brought together in Brown v. Board of Education. The building now houses the Moton Museum, an affiliated area managed locally rather than an independently operated NPS park.'
 }.items():
  intro(ident,foundation,text);article(ident,foundation,'History & culture','School desegregation and this place',text)
  history(ident,foundation,'2025-01-09','affiliation','A Secretary of the Interior decision established this site as an affiliated area associated with Brown v. Board of Education National Historical Park; existing ownership was retained.')
 u='https://www.nps.gov/places/chicago-portage.htm'
 intro('chicago-portage-national-historic-site',u,'The Chicago Portage preserves a remnant of the overland link between the Great Lakes and Mississippi River systems. Indigenous travelers used this route before Marquette and Joliet crossed it in 1673. Forest Preserves of Cook County maintains the wooded landscape and interpretation near Lyons, Illinois; it is separately classified as an affiliated area.')
 article('chicago-portage-national-historic-site',u,'History & culture','Water routes and the Chicago Portage','Indigenous travel routes linked watersheds long before French exploration. The portage later helped connect the interior through canals and transportation corridors, influencing Chicago’s growth. Portage Woods and Ottawa Trail Woods retain fragments of the earlier landscape, interpreted through trails and signs.')
 history('chicago-portage-national-historic-site',u,'1952','designation','The Chicago Portage was dedicated a National Historic Site in non-federal ownership; the official roster classifies it separately as an affiliated area.')
 u='https://www.nps.gov/articles/marquette.htm'
 intro('father-marquette-national-memorial',u,'Within Michigan’s Straits State Park at St. Ignace, this memorial interprets Jacques Marquette’s life and his work with Louis Jolliet exploring and mapping the Mississippi Valley. Outdoor interpretation places their journey within French colonial expansion and existing Indigenous knowledge of the region’s waterways.')
 article('father-marquette-national-memorial',u,'History & culture','Missionary, traveler and colonial exploration','Marquette learned several Indigenous languages while working in New France. His surviving expedition notes became an important record after much of Jolliet’s documentation was damaged. The memorial’s outdoor trail interprets these journeys within a landscape Indigenous peoples already knew and traveled.')
 u='https://www.nps.gov/timu/learn/historyculture/foca_visiting.htm'
 intro('fort-caroline-national-memorial',u,'Fort Caroline National Memorial on the St. Johns River in Jacksonville hosts the Timucuan Preserve Visitor Center. Its river setting supports historical interpretation, nature walks and wildlife observation, with nearby associated areas including the Ribault Column, Spanish Pond and Theodore Roosevelt Area.')
 for name,kind,desc in [('Ribault Column','monument','An associated commemorative location identified in the official Fort Caroline visitor guide.'),('Spanish Pond','place','An associated outdoor area identified by the official guide for exploring beyond Fort Caroline.'),('Timucuan Preserve Visitor Center','visitor-center','Fort Caroline hosts the preserve’s visitor center, a starting point for questions and historical and nature exploration.')]:feature('fort-caroline-national-memorial',u,name,kind,desc)
 u='https://www.nps.gov/articles/000/stratotype-inventory-jodr.htm'
 intro('john-d-rockefeller',u,'The John D. Rockefeller, Jr. Memorial Parkway links Grand Teton and Yellowstone in Wyoming. Congress authorized it in 1972 to recognize Rockefeller’s conservation philanthropy. Between volcanic plateaus and fault-block mountains, its landscape records geothermal, glacial and volcanic influences.')
 article('john-d-rockefeller',u,'Nature & geology','A link between contrasting mountain landscapes','The parkway lies between Yellowstone’s volcanic plateaus and Grand Teton’s fault-block mountains. Its geological record includes geothermal, glacial and volcanic features. The NPS stratotype inventory documents reference exposures used to describe rock units, keeping geological interpretation distinct from visitor routing.')
 history('john-d-rockefeller',u,'1972-08-25','authorization','Congress authorized the memorial parkway to commemorate John D. Rockefeller, Jr.’s contributions to the National Park System.')
 u='https://www.nps.gov/noca/planyourvisit/stehekin.htm'
 intro('lake-chelan-national-recreation-area',u,'Lake Chelan National Recreation Area includes Stehekin, a community at the lake’s headwaters and a gateway to the North Cascades. The valley has long served travelers crossing the mountains. No outside road reaches Stehekin; arrival is by foot, boat or plane, making access part of the destination’s character.')
 article('lake-chelan-national-recreation-area',u,'Activities & trails','Stehekin as a mountain gateway','Stehekin links lake travel, valley history and access to North Cascades wilderness. Visitors arrive without a road connection from outside the valley and can explore historical, cultural and outdoor resources. Transport schedules and trail conditions require current official checks rather than reliance on this offline reference.')
 u='https://www.nps.gov/noca/learn/news/ross-lake-national-recreation-area-planning.htm'
 intro('ross-lake-national-recreation-area',u,'Ross Lake National Recreation Area forms the North Cascades Highway corridor through a mountain landscape shaped by the Skagit watershed. Ross, Diablo and Gorge reservoirs provide water-based access and recreation within the wider North Cascades complex. This separately listed unit should not be merged with North Cascades National Park.')
 whsa=byid['white-sands-national-park'];a=next(a for a in whsa['articles'] if a['topic']=='Nature & geology');sources[a['source']]={'text':a['text'],'retrievedAt':a['retrievedAt']}
 intro('white-sands-national-park',a['source'],'White Sands National Park protects a large part of the gypsum dunefield in southern New Mexico’s Tularosa Basin. Shifting white dunes lie within the Chihuahuan Desert, with shallow water and specially adapted plants and animals sustaining life in a harsh environment. Its geological landscape also preserves a long record of human presence.')
 u='https://www.nps.gov/stli/learn/historyculture/statue-statistics.htm'
 intro('statue-of-liberty-national-monument',u,'The Statue of Liberty’s copper figure faces the harbor, holding a tablet dated July 4, 1776. Broken chains and a shackle lie at its feet, beyond the view from below. The monument’s museum preserves the original torch, connecting visitors with the sculpture’s construction and later restoration.')
 article('statue-of-liberty-national-monument',u,'History & culture','Symbols, structure and the original torch','The statue’s tablet records the date of American independence, and its feet include a broken shackle and chains. The original torch was replaced in 1986 and relocated to the museum’s Torch Gallery in 2018. NPS distinguishes the thin copper skin from the internal framework and concrete foundation.')
 feature('statue-of-liberty-national-monument',u,'Statue of Liberty Museum','museum','The museum’s Torch Gallery displays the original torch, which was replaced on the statue in 1986 and moved to the gallery in 2018.')
 u='https://www.nps.gov/thingstodo/hike-the-circle-trail.htm'
 feature('pipe',u,'Circle Trail','trail','A paved circuit passes active Indigenous quarry pits, Winnewissa Falls, Old Stone Face and tallgrass prairie.',length=dict(value=.75,unit='mi',method='loop'),routeType='loop',duration='20–60 minutes, as published',accessibility='NPS states the trail is not ADA-compliant; wheelchair use may require assistance.',seasonalNotes='Snow, ice and spring flooding may affect access. Check current alerts.',tags=['waterfall','historic','geology'])
 for name,kind,desc in [('Winnewissa Falls','waterfall','A waterfall along the Circle Trail, interpreted with the prairie landscape and pipestone quarry setting.'),('Old Stone Face','place','A distinctive named geological feature on the Circle Trail, listed alongside the historic quarries and falls.')]:feature('pipe',u,name,kind,desc)
 u='https://www.nps.gov/thingstodo/hiking.htm'
 for name,desc,access in [('Saddle Rock Trail','The visitor-center-to-summit path rises through prairie to a juniper ravine, then climbs steeply with dropoffs.','NPS describes only the first 700 yards as wheelchair accessible; the steep upper portion is not recommended for wheelchair use.'),('Oregon Trail Pathway','The route passes replica covered wagons and eroded original Oregon Trail swales.','The guide describes a 380-yard unpaved section and a later 13 percent uphill grade; this is not an accessibility certification.'),('North Overlook Trail','Summit overlooks reveal the North Platte Valley.','The approach includes a 16 percent uphill grade, and part of the route has a 19 percent downhill grade with dropoffs.'),('South Overlook Trail','A paved summit approach reaches views over the surrounding landscape.','NPS describes accessible summit parking and a roughly 300-yard approach; consult the source for individual requirements.')]:feature('scbl',u,name,'trail',desc,accessibility=access,tags=['historic'] if name=='Oregon Trail Pathway' else ['overlook'])
 u='https://www.nps.gov/agfo/planyourvisit/outdooractivities.htm'
 feature('agfo',u,'Daemonelix Trail','trail','Interpretive exhibits reveal fossil Paleocastor burrows, petrified dunes and traces of ancient soils.',length=dict(value=1,unit='mi',method='published trail total; return basis unspecified'),tags=['geology'])
 feature('agfo',u,'Fossil Hills Trail','trail','Concrete trail and wetland boardwalk lead toward historic fossil excavations above the Niobrara River. No fossil displays are promised on the route.',accessibility='The guide calls the concrete trail accessible; it climbs the fossil hills. Check detailed requirements with NPS.',tags=['historic','geology'],conflicts=[dict(field='length',detail='The retained guide describes 2.8 miles but a caption says 2.7 miles; its 4.3 km conversion also conflicts. Numeric length remains unknown.',sources=[u])])
 feature('agfo',u,'Bone Cabin','historic-site','Harold Cook’s restored homestead cabin served visiting scientists working at the fossil quarries after 1914. An unpaved side trail reaches the cabin.')
 article('agfo',u,'History & culture','Quarries and the Bone Cabin','Fossil discoveries by James Cook preceded organized excavations at the hills. Scientists later used Harold Cook’s homestead cabin while studying the bonebeds. The restored cabin and quarry interpretation connect the landscape to the history of paleontology; these resources do not imply fossils are exposed along today’s hiking trail.')
 article('agfo',u,'Nature & geology','Burrows, ancient soils and wetlands','The Daemonelix route interprets spiral Paleocastor burrows, petrified dunes and traces preserved in ancient soils. The Fossil Hills route crosses modern wetlands and the Niobrara River before climbing through restored mixed-grass prairie, allowing comparison of past and present environments.')
 # Replace thin Bighorn guide descriptions with reviewed, route-specific context.
 descriptions={
 'Beaver Pond Nature Trail':('beaver-pond-nature-trail.htm','Yucca flats and a ridge above Lime Kiln Creek lead down a steep hillside to beaver ponds and evidence of dam-building.'),
 'Bighorn Head Gate':('bighorn-head-gate-trail.htm','A gravel path reaches remnants of an early-twentieth-century irrigation system. Water levels can submerge the head gate.'),
 'Three Mile Access':('three-mile-access-trail.htm','A riverside path follows the Bighorn River to a cottonwood grove, with opportunities to observe fishing and waterbirds.'),
 'Visitor Center Pond':('visitor-center-pond.htm','A concrete loop behind the Lovell visitor center circles a former solar-reflection pond now returning toward marsh habitat.'),
 'Sykes Mountain Trail':('sykes-mountain-trail.htm','A rugged desert-mountain ascent reaches overlooks of Bighorn Canyon and Horseshoe Bend; summer heat is a particular concern.'),
 'Mouth of the Canyon Trail':('mouth-of-the-canyon-trail.htm','Views of the Pryor and Bighorn Mountains contrast with red Chugwater outcrops near Horseshoe Bend.'),
 'State Line Trail':('state-line-trail.htm','Juniper scrubland and limestone plateaus lead to a canyon-rim view, with a connection toward Ranger Delight.'),
 'Ranger Delight':('rangers-delight-trail.htm','A faint road cut and saddle lead toward the canyon rim from near the Montana state line.'),
 "Sullivan's Knob Trail":('Sullivans-Knob-Trail.htm','A canyon-rim walk passes near the ancient Bad Pass Trail, seasonally used by Indigenous travelers between the Bighorn Basin and Northern Plains.'),
 'Two Eagles Interpretive Trail':('two-eagles-interpretive-trail.htm','Interpretation explains stone circles left by Indigenous families who weighted tipi edges with stones. These cultural resources must remain in place.'),
 'Lower Layout Creek Trail':('lower-layout-creek-trail.htm','An old two-track road follows the area south of Layout Creek, with views into Layout Creek Canyon.'),
 'Upper Layout Creek Trail':('upper-layout-creek-trail.htm','A steep hike explores Layout Creek’s water and ranching landscape, whose irrigation history includes Erastus Ewing’s 1897 water claim.'),
 "Barry's Island Trail":('barrys-island-trail.htm','A former two-track road circles Chain Canyon, once used by cattle rustlers, toward Barry’s Island; high reservoir water may cover parts of the route.')}
 trails=json.loads((E/'release072-trails.json').read_text())
 bica=next(p for p in parks if p['parkCode']=='bica')['id']
 for a in trails['parks'][bica]['attractions']:
  path,text=descriptions[a['name']];a['description']=text
  if path:
   u='https://www.nps.gov/bica/planyourvisit/'+path;proof(u);a['relatedSources']=[a['source']];a.update(source=u,sourceKey='',retrievedAt=proof(u))
   if a['name']=='Ranger Delight':a['length']['method']='round trip'
   if a['name'] in ['Sykes Mountain Trail','Upper Layout Creek Trail']:a['elevationGain']=dict(value=1250,unit='ft',method='official trail page elevation gain')
 for name,gain in [('Gillem Bluff Trail',550),('Schonchin Butte Trail',500)]:
  for v in trails['parks'].values():
   for a in v['attractions']:
    if a['name']==name:a['elevationGain']=dict(value=gain,unit='ft',method='published climb')
 (E/'release072-trails.json').write_text(json.dumps(trails,ensure_ascii=False,indent=2)+'\n')
 (E/'release072-curated.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 print('Curated units',len(out['parks']))
if __name__=='__main__':main()

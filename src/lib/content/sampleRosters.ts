export interface SampleRoster {
	id: string;
	label: string;
	description: string;
	data: string;
}

const BALANCED_24 = `name\tid\tgrade
Avery Brooks\tavery.brooks@school.edu\t9
Blake Carter\tblake.carter@school.edu\t9
Casey Daniels\tcasey.daniels@school.edu\t9
Drew Elliott\tdrew.elliott@school.edu\t9
Emerson Fox\temerson.fox@school.edu\t9
Finley Grant\tfinley.grant@school.edu\t9
Gale Harper\tgale.harper@school.edu\t9
Harper Irwin\tharper.irwin@school.edu\t9
Indie Jordan\tindie.jordan@school.edu\t9
Jules Keller\tjules.keller@school.edu\t9
Kai Lawson\tkai.lawson@school.edu\t10
Logan Mercer\tlogan.mercer@school.edu\t10
Marlow Nolan\tmarlow.nolan@school.edu\t10
Noel Ortega\tnoel.ortega@school.edu\t10
Oakley Perez\toakley.perez@school.edu\t10
Parker Quinn\tparker.quinn@school.edu\t10
Quinn Riley\tquinn.riley@school.edu\t10
Rory Sutton\trory.sutton@school.edu\t10
Sage Turner\tsage.turner@school.edu\t10
Tatum Underwood\ttatum.underwood@school.edu\t10
Vale Vaughn\tvale.vaughn@school.edu\t10
Wren Willis\twren.willis@school.edu\t10
Xan Young\txan.young@school.edu\t10
Zion Zhao\tzion.zhao@school.edu\t10`;

const MIXED_32 = `name\tid\tgrade
Aiden Abbott\taiden.abbott@school.edu\t9
Bella Briggs\tbella.briggs@school.edu\t9
Caleb Cross\tcaleb.cross@school.edu\t9
Daisy Drake\tdaisy.drake@school.edu\t9
Evan Ellis\tevan.ellis@school.edu\t9
Fiona Frost\tfiona.frost@school.edu\t9
Gavin Gray\tgavin.gray@school.edu\t9
Holly Hayes\tholly.hayes@school.edu\t9
Isaac Ingram\tisaac.ingram@school.edu\t10
Jenna James\tjenna.james@school.edu\t10
Kara Knox\tkara.knox@school.edu\t10
Leo Lyons\tleo.lyons@school.edu\t10
Maya Moore\tmaya.moore@school.edu\t10
Nate Noble\tnate.noble@school.edu\t10
Olive Owens\tolive.owens@school.edu\t10
Perry Price\tperry.price@school.edu\t10
Quincy Reed\tquincy.reed@school.edu\t11
Riley Ross\triley.ross@school.edu\t11
Seth Stone\tseth.stone@school.edu\t11
Tessa Tate\ttessa.tate@school.edu\t11
Uma Urban\tuma.urban@school.edu\t11
Vera Vance\tvera.vance@school.edu\t11
Wade White\twade.white@school.edu\t11
Xander Wolfe\txander.wolfe@school.edu\t11
Yara York\tyara.york@school.edu\t12
Zane Zeller\tzane.zeller@school.edu\t12
Aria Ames\taria.ames@school.edu\t12
Bryce Benton\tbryce.benton@school.edu\t12
Clara Chase\tclara.chase@school.edu\t12
Dorian Dale\tdorian.dale@school.edu\t12
Eliza East\teliza.east@school.edu\t12
Felix Frost\tfelix.frost@school.edu\t12`;

const SMALL_16 = `name\tid\tgrade
Ava Park\tava.park@school.edu\t9
Ben Ward\tben.ward@school.edu\t9
Cora Lane\tcora.lane@school.edu\t9
Dean Shaw\tdean.shaw@school.edu\t9
Elle Reed\telle.reed@school.edu\t10
Finn Cole\tfinn.cole@school.edu\t10
Gia Bell\tgia.bell@school.edu\t10
Hank Love\thank.love@school.edu\t10
Ivy Moss\tivy.moss@school.edu\t11
Jake Wolf\tjake.wolf@school.edu\t11
Kira Pike\tkira.pike@school.edu\t11
Liam Kane\tliam.kane@school.edu\t11
Mila Rook\tmila.rook@school.edu\t12
Noah Tate\tnoah.tate@school.edu\t12
Omar Lane\tomar.lane@school.edu\t12
Pia Duke\tpia.duke@school.edu\t12`;

const LARGE_48 = `name\tid\tgrade
Aaron Blake\taaron.blake@school.edu\t9
Abby Cole\tabby.cole@school.edu\t9
Ada Cruz\tada.cruz@school.edu\t9
Alec Dean\talec.dean@school.edu\t9
Amir Edwards\tamir.edwards@school.edu\t9
Anya Flores\tanya.flores@school.edu\t9
Ben Gage\tben.gage@school.edu\t9
Bri Hall\tbri.hall@school.edu\t9
Cara Irwin\tcara.irwin@school.edu\t9
Cody James\tcody.james@school.edu\t9
Dale Knox\tdale.knox@school.edu\t9
Dana Lane\tdana.lane@school.edu\t9
Eli Marsh\teli.marsh@school.edu\t10
Ella Neal\tella.neal@school.edu\t10
Enzo Ortiz\tenzo.ortiz@school.edu\t10
Erin Price\terin.price@school.edu\t10
Evan Quick\tevan.quick@school.edu\t10
Faye Ross\tfaye.ross@school.edu\t10
Finn Shaw\tfinn.shaw@school.edu\t10
Gia Tate\tgia.tate@school.edu\t10
Gus Ulrich\tgus.ulrich@school.edu\t10
Hana Vale\thana.vale@school.edu\t10
Hugo West\thugo.west@school.edu\t10
Ivy Yates\tivy.yates@school.edu\t10
Jace Zito\tjace.zito@school.edu\t11
Jana Adams\tjana.adams@school.edu\t11
Jude Baker\tjude.baker@school.edu\t11
Kara Clark\tkara.clark@school.edu\t11
Liam Dunn\tliam.dunn@school.edu\t11
Lola Early\tlola.early@school.edu\t11
Mia Ford\tmia.ford@school.edu\t11
Noah Gray\tnoah.gray@school.edu\t11
Owen Hart\towen.hart@school.edu\t11
Piper Irwin\tpiper.irwin@school.edu\t11
Quinn Jett\tquinn.jett@school.edu\t11
Rae King\trae.king@school.edu\t11
Sage Lane\tsage.lane@school.edu\t12
Theo Moon\ttheo.moon@school.edu\t12
Tia North\ttia.north@school.edu\t12
Uma Oakes\tuma.oakes@school.edu\t12
Vera Pike\tvera.pike@school.edu\t12
Wes Quinn\twes.quinn@school.edu\t12
Willa Rose\twilla.rose@school.edu\t12
Xena Stone\txena.stone@school.edu\t12
Yuri Trent\tyuri.trent@school.edu\t12
Zara Ulman\tzara.ulman@school.edu\t12
Zoe Vale\tzoe.vale@school.edu\t12`;

export const sampleRosters: SampleRoster[] = [
	{
		id: 'balanced-24',
		label: 'Balanced 24',
		description: '24 students across grades 9-10. Good for 6 groups of 4.',
		data: BALANCED_24
	},
	{
		id: 'mixed-32',
		label: 'Mixed 32',
		description: '32 students across grades 9-12. Good for 8 groups of 4.',
		data: MIXED_32
	},
	{
		id: 'small-16',
		label: 'Small 16',
		description: '16 students across grades 9-12. Quick sanity check.',
		data: SMALL_16
	},
	{
		id: 'large-48',
		label: 'Large 48',
		description: '48 students across grades 9-12. Stress test slower algorithms.',
		data: LARGE_48
	}
];

export const sampleRosterById = new Map(
	sampleRosters.map((roster) => [roster.id, roster])
);

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

/**
 * 2026–27 Academic Session Syllabus Data for Horizon
 * Classes: 8, 9, 10
 */

export const SYLLABUS_2026_DATA = [
  // ==========================================
  // CLASS 8
  // ==========================================
  // Class 8 Mathematics
  {
    student_class: 'Class 8',
    subject: 'Mathematics',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Rational Numbers',
        topics: [
          { title: 'Properties of Rational Numbers', description: 'Closure, commutativity, associativity, and distributivity properties.' },
          { title: 'Representation of Rational Numbers on the Number Line', description: 'Plotting rational numbers visually on a continuous number line.' },
          { title: 'Rational Numbers between Two Rational Numbers', description: 'Finding infinitely many rational numbers using mean method and common denominator method.' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Linear Equations in One Variable',
        topics: [
          { title: 'Solving Equations with Linear Expressions on One Side', description: 'Simplifying and solving basic single-variable linear equations.' },
          { title: 'Applications of Linear Equations', description: 'Word problems involving age, perimeter, currency notes, and numbers.' },
          { title: 'Solving Equations having the Variable on Both Sides', description: 'Transposing variables and constants to opposite sides.' },
          { title: 'Reducing Equations to Simpler / Linear Form', description: 'Cross-multiplication technique for algebraic fractions.' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Understanding Quadrilaterals',
        topics: [
          { title: 'Polygons and Classification', description: 'Convex, concave, regular, and irregular polygons.' },
          { title: 'Sum of the Measures of the Exterior Angles of a Polygon', description: 'Proving and applying the 360-degree exterior angle sum theorem.' },
          { title: 'Kinds of Quadrilaterals', description: 'Properties of trapeziums, kites, parallelograms, rhombuses, rectangles, and squares.' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Data Handling',
        topics: [
          { title: 'Looking for Information and Grouping Data', description: 'Raw data, frequency distribution tables, and class intervals.' },
          { title: 'Bars with a Difference — Histograms', description: 'Constructing and interpreting histograms for continuous intervals.' },
          { title: 'Circle Graph or Pie Chart', description: 'Calculating central angles and constructing pie charts.' },
          { title: 'Chance and Probability', description: 'Outcomes, equally likely events, and calculating elementary probabilities.' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Square and Square Roots',
        topics: [
          { title: 'Properties of Square Numbers', description: 'Units digits, sum of odd numbers, and Pythagorean triplets.' },
          { title: 'Finding Square Root by Prime Factorisation', description: 'Pairing prime factors to evaluate exact square roots.' },
          { title: 'Finding Square Root by Division Method', description: 'Long division algorithm for whole numbers and decimals.' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Cube and Cube Roots',
        topics: [
          { title: 'Cubes of Numbers and Hardy-Ramanujan Numbers', description: 'Understanding perfect cubes and smallest prime multiples.' },
          { title: 'Cube Roots through Prime Factorisation', description: 'Forming triplets of prime factors.' },
          { title: 'Cube Root of a Cube Number by Estimation Method', description: 'Estimating cube roots using units digit patterns.' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Comparing Quantities',
        topics: [
          { title: 'Ratios, Percentages, and Ratios to Percentages', description: 'Converting ratios and fractions into percentage increases/decreases.' },
          { title: 'Finding Discount and Sales Tax / VAT / GST', description: 'Calculating marked price, discount percentage, and GST additions.' },
          { title: 'Compound Interest', description: 'Deducing formula for compound interest compounded annually and half-yearly.' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Algebraic Expressions and Identities',
        topics: [
          { title: 'Monomials, Binomials, and Polynomials', description: 'Classifying algebraic expressions and identifying like/unlike terms.' },
          { title: 'Multiplication of Algebraic Expressions', description: 'Multiplying monomial by monomial, monomial by polynomial, and binomial by binomial.' },
          { title: 'Standard Algebraic Identities', description: '(a+b)^2, (a-b)^2, a^2-b^2, and (x+a)(x+b) identities.' }
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Mensuration',
        topics: [
          { title: 'Area of Trapezium and General Quadrilaterals', description: 'Decomposition method and altitude-based area formulas.' },
          { title: 'Surface Area of Cuboid, Cube, and Cylinder', description: 'Lateral and total surface areas.' },
          { title: 'Volume of Cuboid, Cube, and Cylinder', description: 'Capacity and volume calculations.' }
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'Exponents and Powers',
        topics: [
          { title: 'Powers with Negative Exponents', description: 'Understanding multiplicative inverses and negative powers.' },
          { title: 'Laws of Exponents', description: 'Product, quotient, power of power, and zero exponent rules.' },
          { title: 'Use of Exponents to Express Small Numbers in Standard Form', description: 'Scientific notation for microscopic and astronomical numbers.' }
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Direct and Inverse Proportions',
        topics: [
          { title: 'Direct Proportion', description: 'Constant ratio x/y = k and real-life scaling problems.' },
          { title: 'Inverse Proportion', description: 'Constant product x*y = k and time/work/speed problems.' }
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Factorisation',
        topics: [
          { title: 'Factorisation by Common Factors and Regrouping', description: 'Extracting highest common factors and regrouping terms.' },
          { title: 'Factorisation using Algebraic Identities', description: 'Applying difference of squares and perfect square identities.' },
          { title: 'Division of Algebraic Expressions', description: 'Dividing polynomial by monomial and polynomial by polynomial.' }
        ]
      },
      {
        chapter_number: 13,
        chapter_name: 'Introduction to Graphs',
        topics: [
          { title: 'A Bar Graph, Pie Graph, and Histogram Overview', description: 'Comparing different visual representation techniques.' },
          { title: 'Linear Graphs and Coordinates', description: 'Plotting points (x, y) on Cartesian grid axes.' },
          { title: 'Some Applications of Linear Graphs', description: 'Quantity vs cost and distance vs time graph interpretations.' }
        ]
      }
    ]
  },

  // Class 8 Science
  {
    student_class: 'Class 8',
    subject: 'Science',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Crop Production and Management',
        topics: [
          { title: 'Agricultural Practices and Crop Types', description: 'Kharif and Rabi crops.' },
          { title: 'Preparation of Soil', description: 'Ploughing, levelling, and tilling.' },
          { title: 'Sowing and Quality Seeds', description: 'Traditional tools and seed drills.' },
          { title: 'Adding Manure and Fertilisers', description: 'Organic vs chemical soil nutrient replenishment.' },
          { title: 'Irrigation Methods', description: 'Traditional vs modern drip and sprinkler systems.' },
          { title: 'Protection from Weeds', description: 'Weeding and weedicides.' },
          { title: 'Harvesting and Storage', description: 'Threshing, winnowing, granaries, and silos.' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Microorganisms: Friend and Foe',
        topics: [
          { title: 'Types of Microorganisms', description: 'Bacteria, fungi, protozoa, and algae.' },
          { title: 'Friendly Microorganisms', description: 'Commercial, medicinal uses, fermentation, and soil fertility.' },
          { title: 'Vaccines and Antibodies', description: 'Immunity mechanism and disease prevention.' },
          { title: 'Harmful Microorganisms and Pathogens', description: 'Communicable human, animal, and plant diseases.' },
          { title: 'Food Preservation Techniques', description: 'Chemical, salt, sugar, oil, vinegar, heat, and cold treatment.' },
          { title: 'Nitrogen Cycle', description: 'Biological nitrogen fixation and atmospheric recycling.' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Coal and Petroleum',
        topics: [
          { title: 'Exhaustible and Inexhaustible Natural Resources', description: 'Classification of energy resources.' },
          { title: 'Coal Formation and Carbonisation', description: 'Fossil fuel origin under high pressure and temperature.' },
          { title: 'Products of Coal', description: 'Coke, coal tar, and coal gas.' },
          { title: 'Petroleum Refining and Fractionating Column', description: 'Fractional distillation of crude oil.' },
          { title: 'Natural Gas and CNG', description: 'Clean fuel advantages and storage.' },
          { title: 'Conservation of Fossil Fuels', description: 'PCRA guidelines for fuel efficiency.' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Combustion and Flame',
        topics: [
          { title: 'Combustion and Fuel Conditions', description: 'Combustible substances, oxygen, and ignition temperature.' },
          { title: 'Types of Combustion', description: 'Rapid, spontaneous, and explosive combustion.' },
          { title: 'Fire Control and Extinguishers', description: 'Water, foam, and CO2 fire extinguishers.' },
          { title: 'Structure of a Flame', description: 'Inner, middle, and outer zones of candle flame.' },
          { title: 'Calorific Value and Fuel Efficiency', description: 'Measuring heat energy in kJ/kg.' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Conservation of Plants and Animals',
        topics: [
          { title: 'Deforestation and Its Consequences', description: 'Soil erosion, desertification, and global warming.' },
          { title: 'Protected Areas', description: 'Biosphere reserves, national parks, and wildlife sanctuaries.' },
          { title: 'Endemic and Endangered Species', description: 'Flora, fauna, and Red Data Book entries.' },
          { title: 'Migration of Birds', description: 'Seasonal long-distance animal migration.' },
          { title: 'Reforestation and Paper Recycling', description: 'Sustainable forest recovery practices.' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Reproduction in Animals',
        topics: [
          { title: 'Modes of Reproduction', description: 'Sexual and asexual reproduction.' },
          { title: 'Male and Female Reproductive Organs', description: 'Sperm, ovum, testes, ovaries, and fallopian tubes.' },
          { title: 'Fertilisation', description: 'Internal vs external fertilisation, zygote formation.' },
          { title: 'Development of Embryo', description: 'Foetus development, viviparous and oviparous animals.' },
          { title: 'Asexual Reproduction Methods', description: 'Budding in hydra and binary fission in amoeba.' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Reaching the Age of Adolescence',
        topics: [
          { title: 'Adolescence and Puberty', description: 'Physical, voice, and body shape changes.' },
          { title: 'Secondary Sexual Characters', description: 'Hormonal regulation by pituitary and gonads.' },
          { title: 'Endocrine Glands and Hormones', description: 'Thyroxine, insulin, adrenaline, estrogen, and testosterone.' },
          { title: 'Reproductive Phase of Life in Humans', description: 'Menstruation, menarche, and menopause.' },
          { title: 'Sex Determination', description: 'Sex chromosomes X and Y.' },
          { title: 'Reproductive Health and Personal Hygiene', description: 'Nutritional needs and drug avoidance.' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Force and Pressure',
        topics: [
          { title: 'Force — A Push or a Pull', description: 'Interaction between objects.' },
          { title: 'Contact Forces', description: 'Muscular force and friction.' },
          { title: 'Non-contact Forces', description: 'Magnetic, electrostatic, and gravitational forces.' },
          { title: 'Pressure Concept', description: 'Force per unit area.' },
          { title: 'Liquid and Gas Pressure', description: 'Pressure exerted by fluids at depth.' },
          { title: 'Atmospheric Pressure', description: 'Magdeburg hemispheres and atmospheric force.' }
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Friction',
        topics: [
          { title: 'Factors Affecting Friction', description: 'Surface roughness and pressing force.' },
          { title: 'Types of Friction', description: 'Static, sliding, and rolling friction.' },
          { title: 'Friction — A Necessary Evil', description: 'Advantages and disadvantages in daily life.' },
          { title: 'Increasing and Reducing Friction', description: 'Treads, lubricants, and ball bearings.' },
          { title: 'Fluid Friction / Drag', description: 'Streamlined shapes in aviation and marine motion.' }
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'Sound',
        topics: [
          { title: 'Sound Produced by a Vibrating Body', description: 'Vibration amplitude and frequency.' },
          { title: 'Sound Produced by Humans', description: 'Larynx and vocal cords.' },
          { title: 'Propagation of Sound Needs a Medium', description: 'Vacuum inability to transmit sound.' },
          { title: 'Structure of Human Ear', description: 'Eardrum, ossicles, and auditory nerve.' },
          { title: 'Audible and Inaudible Sounds', description: 'Infrasound (<20 Hz) and ultrasound (>20,000 Hz).' },
          { title: 'Noise Pollution and Measures', description: 'Loudness in decibels and noise control.' }
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Chemical Effects of Electric Current',
        topics: [
          { title: 'Conductors and Insulators of Electricity', description: 'Testing liquid conductivity.' },
          { title: 'Chemical Effects of Current', description: 'Bubbles, gas evolution, and electrode deposits.' },
          { title: 'Electroplating Process', description: 'Copper/chromium plating application and procedure.' }
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Some Natural Phenomena',
        topics: [
          { title: 'Lightning and Charging by Rubbing', description: 'Transfer of static charges.' },
          { title: 'Types of Charges and Electroscope', description: 'Like charges repel, unlike attract.' },
          { title: 'Lightning Safety and Conductors', description: 'Earthing and lightning conductors on buildings.' },
          { title: 'Earthquakes and Seismic Waves', description: 'Tectonic plate movement, fault zones, and seismograph.' },
          { title: 'Earthquake Protection Measures', description: 'Seismic safe building design and emergency steps.' }
        ]
      },
      {
        chapter_number: 13,
        chapter_name: 'Light',
        topics: [
          { title: 'Laws of Reflection', description: 'Angle of incidence equals angle of reflection.' },
          { title: 'Regular and Diffused Reflection', description: 'Smooth vs rough surface reflection.' },
          { title: 'Multiple Images and Kaleidoscope', description: 'Images formed by inclined plane mirrors.' },
          { title: 'Dispersion of Sunlight', description: 'Prism spectrum splitting sunlight into seven colors.' },
          { title: 'Structure and Care of Human Eye', description: 'Cornea, iris, pupil, lens, retina, rods, and cones.' },
          { title: 'Visually Impaired Persons and Braille System', description: 'Louis Braille tactile reading system.' }
        ]
      }
    ]
  },

  // Class 8 Social Science
  {
    student_class: 'Class 8',
    subject: 'Social Science',
    chapters: [
      // History
      { chapter_number: 1, chapter_name: 'History: How, When and Where', topics: [{ title: 'Periodisation of Indian History', description: 'James Mill colonial periodisation and modern historical classification.' }, { title: 'Official Records and Surveys', description: 'British administrative archives, revenue, and census surveys.' }] },
      { chapter_number: 2, chapter_name: 'History: From Trade to Territory', topics: [{ title: 'East India Company Comes East', description: 'Mercantilism and royal charters.' }, { title: 'Battle of Plassey and Buxar', description: 'Sirajuddaulah, Mir Jafar, and Diwani rights.' }, { title: 'Company Expansion and Subsidiary Alliance', description: 'Paramountcy policy and Doctrine of Lapse under Dalhousie.' }] },
      { chapter_number: 3, chapter_name: 'History: Ruling the Countryside', topics: [{ title: 'Permanent Settlement and Ryotwari System', description: 'Cornwallis tax reforms and Munros direct assessment.' }, { title: 'Indigo Rebellion and Blue Mutiny', description: 'Nij and Ryoti cultivation systems and farmers revolt.' }] },
      { chapter_number: 4, chapter_name: 'History: Tribals, Dikus and the Vision of a Golden Age', topics: [{ title: 'Tribal Livelihoods and Jhum Cultivation', description: 'Shifting agriculture, hunter-gatherers, and pastoralists.' }, { title: 'Impact of Colonial Forest Laws', description: 'Reserved forests and Birsa Munda movement in Chota Nagpur.' }] },
      { chapter_number: 5, chapter_name: 'History: When People Rebel (1857 and After)', topics: [{ title: 'Causes of the 1857 Revolt', description: 'Political, economic, military, and religious grievances.' }, { title: 'Spread of Revolt and Key Leaders', description: 'Bahadur Shah Zafar, Rani Lakshmibai, Nana Saheb, and Kunwar Singh.' }, { title: 'Government Reforms After 1857', description: 'Transfer of power from East India Company to the British Crown.' }] },
      { chapter_number: 6, chapter_name: 'History: Civilising the Native, Educating the Nation', topics: [{ title: 'Orientalists vs Anglicists Debate', description: 'William Jones vs Thomas Babington Macaulay Minute 1835.' }, { title: 'Wood Dispatch of 1854', description: 'Educational policy for commercial utility in India.' }, { title: 'Local Pathshalas and National Education', description: 'Rabindranath Tagore Visva-Bharati and Mahatma Gandhi views.' }] },
      { chapter_number: 7, chapter_name: 'History: Women, Caste and Reform', topics: [{ title: 'Abolition of Sati and Widow Remarriage', description: 'Raja Rammohan Roy and Ishwar Chandra Vidyasagar.' }, { title: 'Girls Education Movement', description: 'Jyotirao and Savitribai Phule, Pandita Ramabai, and Begum Rokeya.' }, { title: 'Anti-Caste Movements', description: 'Satnami movement, Sri Narayana Guru, and Dr. B.R. Ambedkar Temple Entry.' }] },
      { chapter_number: 8, chapter_name: 'History: The Making of the National Movement (1870s-1947)', topics: [{ title: 'Emergence of Indian National Congress', description: 'Moderate leaders and early economic nationalism.' }, { title: 'Partition of Bengal and Swadeshi Movement', description: 'Extremist leaders Tilak, Rai, and Pal.' }, { title: 'Gandhian Era and Mass Movements', description: 'Non-Cooperation, Civil Disobedience, Salt March, and Quit India.' }] },

      // Geography
      { chapter_number: 9, chapter_name: 'Geography: Resources', topics: [{ title: 'Types of Resources', description: 'Natural, human-made, and human resources.' }, { title: 'Conservation and Sustainable Development', description: 'Principles of sustainable resource utilisation.' }] },
      { chapter_number: 10, chapter_name: 'Geography: Land, Soil, Water, Natural Vegetation and Wildlife', topics: [{ title: 'Land Use and Soil Formation', description: 'Factors influencing soil profile and conservation methods.' }, { title: 'Water Scarcity and Conservation', description: 'Rainwater harvesting and watershed management.' }, { title: 'Distribution of Vegetation and Wildlife Protection', description: 'Forest types, CITES agreement, and biosphere reserves.' }] },
      { chapter_number: 11, chapter_name: 'Geography: Agriculture', topics: [{ title: 'Farming Systems', description: 'Subsistence, commercial, shifting, and nomadic herding.' }, { title: 'Major Crops', description: 'Rice, wheat, millets, cotton, jute, coffee, and tea.' }] },
      { chapter_number: 12, chapter_name: 'Geography: Industries', topics: [{ title: 'Classification of Industries', description: 'Raw material, size, and ownership classification.' }, { title: 'Iron and Steel Industry', description: 'Jamshedpur and Pittsburgh comparison.' }, { title: 'Cotton Textile and Information Technology', description: 'Ahmedabad, Osaka, Bengaluru, and Silicon Valley.' }] },
      { chapter_number: 13, chapter_name: 'Geography: Human Resources', topics: [{ title: 'Distribution and Density of Population', description: 'Geographical, social, and economic factors.' }, { title: 'Population Change and Composition', description: 'Birth rate, death rate, migration, and age-sex pyramid.' }] },

      // Political Science
      { chapter_number: 14, chapter_name: 'Civics: The Indian Constitution', topics: [{ title: 'Key Features of the Constitution', description: 'Federalism, parliamentary form, separation of powers, fundamental rights, and secularism.' }] },
      { chapter_number: 15, chapter_name: 'Civics: Understanding Secularism', topics: [{ title: 'Concept of Indian Secularism', description: 'Principled distance between state and religion.' }] },
      { chapter_number: 16, chapter_name: 'Civics: Parliament and the Making of Laws', topics: [{ title: 'Role of Parliament and Law Making', description: 'Representative democracy and legislative procedure.' }] },
      { chapter_number: 17, chapter_name: 'Civics: Judiciary', topics: [{ title: 'Structure of Courts in India', description: 'Supreme Court, High Courts, Subordinate Courts, and PIL.' }] },
      { chapter_number: 18, chapter_name: 'Civics: Understanding and Confronting Marginalisation', topics: [{ title: 'Adivasis, Minorities, and Marginalisation', description: 'Constitutional safeguards, Scheduled Castes and Scheduled Tribes Act 1989.' }] },
      { chapter_number: 19, chapter_name: 'Civics: Public Facilities and Law & Social Justice', topics: [{ title: 'Right to Water and Public Infrastructure', description: 'Government role in sanitation, health, and minimum wages.' }] }
    ]
  },

  // Class 8 Languages
  {
    student_class: 'Class 8',
    subject: 'English',
    chapters: [
      { chapter_number: 1, chapter_name: 'The Best Christmas Present in the World', topics: [{ title: 'Prose Reading & Comprehension', description: 'Story analysis and vocabulary.' }] },
      { chapter_number: 2, chapter_name: 'The Tsunami', topics: [{ title: 'Prose Reading & Comprehension', description: 'Real stories of bravery and survival.' }] },
      { chapter_number: 3, chapter_name: 'Glimpses of the Past', topics: [{ title: 'Pictorial Prose Analysis', description: 'Freedom struggle 1757-1857.' }] },
      { chapter_number: 4, chapter_name: 'Bepin Choudhury\'s Lapse of Memory', topics: [{ title: 'Prose Reading & Plot Twist Analysis', description: 'Character study.' }] },
      { chapter_number: 5, chapter_name: 'The Summit Within', topics: [{ title: 'Autobiographical Essay', description: 'Mount Everest expedition.' }] },
      { chapter_number: 6, chapter_name: 'Grammar: Tenses, Modals & Voice', topics: [{ title: 'Active & Passive Voice', description: 'Rules and transformations.' }, { title: 'Modals & Tenses', description: 'Usage in context.' }] },
      { chapter_number: 7, chapter_name: 'Writing Skills & Reading Comprehension', topics: [{ title: 'Formal Letters & Notices', description: 'Format and drafting practice.' }, { title: 'Discursive & Factual Passages', description: 'Unseen comprehension.' }] }
    ]
  },
  {
    student_class: 'Class 8',
    subject: 'Hindi',
    chapters: [
      { chapter_number: 1, chapter_name: 'ध्वनि / बस की यात्रा', topics: [{ title: 'कविता एवं कहानी व्याख्या', description: 'भावार्थ एवं प्रश्नोत्तर।' }] },
      { chapter_number: 2, chapter_name: 'दीवानों की हस्ती / भगवान के डाकिए', topics: [{ title: 'काव्य सौंदर्य एवं भाव बोध', description: 'पद विश्लेषण।' }] },
      { chapter_number: 3, chapter_name: 'हिंदी व्याकरण: समास, संधि एवं कारक', topics: [{ title: 'समास के भेद एवं विग्रह', description: 'तत्पुरुष, द्विगु, द्वंद्व, बहुव्रीहि।' }, { title: 'संधि (स्वर, व्यंजन, विसर्ग)', description: 'नियम एवं उदाहरण।' }] },
      { chapter_number: 4, chapter_name: 'व्यावहारिक लेखन: पत्र एवं निबंध', topics: [{ title: 'औपचारिक एवं अनौपचारिक पत्र', description: 'प्रारूप एवं अभ्यास।' }, { title: 'अनुच्छेद एवं निबंध लेखन', description: 'समसामयिक विषय।' }] }
    ]
  },
  {
    student_class: 'Class 8',
    subject: 'Sanskrit',
    chapters: [
      { chapter_number: 1, chapter_name: 'सुभाषितानि / बिलस्य वाणी न कदापि मे श्रुता', topics: [{ title: 'श्लोक अन्वय एवं कथा परिचय', description: 'सरलार्थ एवं अभ्यास।' }] },
      { chapter_number: 2, chapter_name: 'संस्कृत व्याकरण: शब्दरूपाणि धातुरूपाणि च', topics: [{ title: 'बालक, लता, नदी शब्द रूप', description: 'विभक्ति अभ्यास।' }, { title: 'पठ्, भू, लभ् धातु रूप (पञ्च लकार)', description: 'लकार प्रयोग।' }] }
    ]
  },

  // ==========================================
  // CLASS 9
  // ==========================================
  // Class 9 Mathematics
  {
    student_class: 'Class 9',
    subject: 'Mathematics',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Number Systems',
        topics: [
          { title: 'Exercise 1.1 — Irrational Numbers', description: 'Defining and identifying real and irrational numbers.' },
          { title: 'Exercise 1.2 — Real Numbers and Decimal Expansions', description: 'Terminating, non-terminating recurring decimal expansions.' },
          { title: 'Exercise 1.3 — Operations on Real Numbers', description: 'Rationalising the denominator.' },
          { title: 'Exercise 1.4 — Laws of Exponents for Real Numbers', description: 'Simplifying radical expressions.' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Polynomials',
        topics: [
          { title: 'Exercise 2.1 — Polynomials in One Variable', description: 'Degrees, coefficients, and types of polynomials.' },
          { title: 'Exercise 2.2 — Zeroes of a Polynomial', description: 'Evaluating zeroes algebraically.' },
          { title: 'Exercise 2.3 — Factorisation of Polynomials', description: 'Factor theorem and splitting middle term.' },
          { title: 'Exercise 2.4 — Algebraic Identities', description: 'Cubic and square polynomial expansion identities.' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Coordinate Geometry',
        topics: [
          { title: 'Exercise 3.1 — Cartesian Plane', description: 'Axes, quadrants, origin, and coordinates (x, y).' },
          { title: 'Exercise 3.2 — Plotting Points in Cartesian Plane', description: 'Plotting ordered pairs.' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Linear Equations in Two Variables',
        topics: [
          { title: 'Exercise 4.1 — Linear Equations Concept', description: 'Expressing equations in standard form ax + by + c = 0.' },
          { title: 'Exercise 4.2 — Solution of a Linear Equation', description: 'Finding infinitely many solutions.' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Introduction to Euclid\'s Geometry',
        topics: [
          { title: 'Exercise 5.1 — Axioms and Postulates', description: 'Euclids definitions, 5 postulates, and equivalent versions.' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Lines and Angles',
        topics: [
          { title: 'Exercise 6.1 — Basic Terms and Intersecting Lines', description: 'Vertically opposite angles and linear pairs.' },
          { title: 'Exercise 6.2 — Lines Parallel to the Same Line', description: 'Transversal angles and parallel line criteria.' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Triangles',
        topics: [
          { title: 'Exercise 7.1 — Congruence Criteria (SAS, ASA)', description: 'Proving triangle congruence.' },
          { title: 'Exercise 7.2 — Properties of an Isosceles Triangle', description: 'Angles opposite to equal sides.' },
          { title: 'Exercise 7.3 — SSS and RHS Congruence Criteria', description: 'Right angle hypotenuse side criterion.' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Quadrilaterals',
        topics: [
          { title: 'Exercise 8.1 — Properties of Parallelograms', description: 'Diagonals and opposite side equality.' },
          { title: 'Exercise 8.2 — The Mid-Point Theorem', description: 'Proving segment parallel to third side.' }
        ]
      },

      // =========================================================================
      // CRITICAL CONSTRAINT: Class 9 Maths Chapters 9-15
      // Physical NCERT exercise numbering was NOT verified in 2026 research.
      // DO NOT FABRICATE exercise numbers for Class 9 Maths Chapters 9-15!
      // Store verified chapter data without fabricated exercise numbers.
      // =========================================================================
      { chapter_number: 9, chapter_name: 'Circles', topics: [] },
      { chapter_number: 10, chapter_name: 'Heron\'s Formula', topics: [] },
      { chapter_number: 11, chapter_name: 'Surface Areas and Volumes', topics: [] },
      { chapter_number: 12, chapter_name: 'Statistics', topics: [] },
      { chapter_number: 13, chapter_name: 'Probability', topics: [] }
    ]
  },

  // Class 9 Science
  {
    student_class: 'Class 9',
    subject: 'Science',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Matter in Our Surroundings',
        topics: [
          { title: 'Physical Nature of Matter', description: 'Particles of matter, size, and continuous motion.' },
          { title: 'States of Matter', description: 'Solid, liquid, gas, plasma, and Bose-Einstein condensate.' },
          { title: 'Can Matter Change Its State?', description: 'Effect of temperature, melting point, boiling point, and latent heat.' },
          { title: 'Sublimation and Effect of Change of Pressure', description: 'Direct solid-to-gas transition and liquefaction of gases.' },
          { title: 'Evaporation and Factors Affecting It', description: 'Surface area, humidity, wind speed, and cooling effect.' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Is Matter Around Us Pure',
        topics: [
          { title: 'Pure Substances vs Mixtures', description: 'Homogeneous and heterogeneous mixtures.' },
          { title: 'Solutions, Suspensions, and Colloids', description: 'Concentration of solution and Tyndall effect.' },
          { title: 'Separating Components of a Mixture', description: 'Evaporation, centrifugation, chromatography, and distillation.' },
          { title: 'Physical and Chemical Changes', description: 'Reversible physical vs permanent chemical transformations.' },
          { title: 'Types of Pure Substances', description: 'Elements, metals, non-metals, metalloids, and compounds.' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Atoms and Molecules',
        topics: [
          { title: 'Laws of Chemical Combination', description: 'Law of conservation of mass and constant proportions.' },
          { title: 'Dalton\'s Atomic Theory', description: 'Postulates and limitations.' },
          { title: 'What is an Atom and Atomic Mass?', description: 'Atomic mass unit (u) and atomic symbols.' },
          { title: 'What is a Molecule and Ion?', description: 'Molecules of elements, compounds, cations, and anions.' },
          { title: 'Writing Chemical Formulae', description: 'Valency cross-over method.' },
          { title: 'Molecular Mass and Formula Unit Mass', description: 'Calculating relative molecular weights.' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Structure of the Atom',
        topics: [
          { title: 'Subatomic Particles', description: 'Discovery of electron (Thomson), proton (Goldstein), and neutron (Chadwick).' },
          { title: 'Thomson\'s and Rutherford\'s Models', description: 'Plum pudding model and alpha-particle scattering experiment.' },
          { title: 'Bohr\'s Model of Atom', description: 'Discrete energy shells K, L, M, N.' },
          { title: 'Valency and Atomic/Mass Number', description: 'Valence electrons, atomic number Z, mass number A.' },
          { title: 'Isotopes and Isobars', description: 'Applications of isotopes in medicine and nuclear fuel.' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'The Fundamental Unit of Life',
        topics: [
          { title: 'Cell Discovery and Cell Theory', description: 'Robert Hooke, Leeuwenhoek, Schleiden, Schwann, and Virchow.' },
          { title: 'Prokaryotic vs Eukaryotic Cells', description: 'Organelle structure and nuclear boundary.' },
          { title: 'Plasma Membrane and Transport', description: 'Diffusion, osmosis, hypotonic, hypertonic, and isotonic solutions.' },
          { title: 'Cell Wall and Nucleus', description: 'Plasmolysis, chromatin, chromosomes, and DNA/proteins.' },
          { title: 'Cytoplasm and Cell Organelles', description: 'Endoplasmic reticulum, Golgi apparatus, lysosomes, mitochondria, plastids, and vacuoles.' },
          { title: 'Cell Division', description: 'Mitosis for growth and meiosis for gamete formation.' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Tissues',
        topics: [
          { title: 'Plant Tissues — Meristematic Tissues', description: 'Apical, lateral, and intercalary meristems.' },
          { title: 'Plant Tissues — Permanent Tissues', description: 'Simple (parenchyma, collenchyma, sclerenchyma) and Complex (xylem, phloem).' },
          { title: 'Animal Tissues — Epithelial Tissue', description: 'Squamous, cuboidal, columnar, and ciliated epithelium.' },
          { title: 'Animal Tissues — Connective Tissue', description: 'Blood, bone, cartilage, ligament, tendon, and adipose tissue.' },
          { title: 'Animal Tissues — Muscular and Nervous Tissue', description: 'Striated, unstriated, cardiac muscles, and neuron structure.' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Motion',
        topics: [
          { title: 'Describing Motion and Reference Point', description: 'Distance vs displacement.' },
          { title: 'Uniform and Non-uniform Motion', description: 'Speed, velocity, and average speed.' },
          { title: 'Rate of Change of Velocity', description: 'Acceleration concept and uniform acceleration.' },
          { title: 'Graphical Representation of Motion', description: 'Distance-time and velocity-time graphs.' },
          { title: 'Equations of Motion by Graphical Method', description: 'v = u + at, s = ut + 1/2 at^2, v^2 = u^2 + 2as.' },
          { title: 'Uniform Circular Motion', description: 'Centripetal acceleration and constant speed circular path.' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Force and Laws of Motion',
        topics: [
          { title: 'Balanced and Unbalanced Forces', description: 'Net external force and motion state.' },
          { title: 'First Law of Motion and Inertia', description: 'Inertia of rest, motion, and direction.' },
          { title: 'Second Law of Motion and Momentum', description: 'F = ma and momentum p = mv.' },
          { title: 'Third Law of Motion', description: 'Action and reaction forces.' },
          { title: 'Conservation of Momentum', description: 'Recoil velocity of gun and rocket propulsion.' }
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Gravitation',
        topics: [
          { title: 'Universal Law of Gravitation', description: 'Formula F = G * m1 * m2 / d^2 and constant G.' },
          { title: 'Free Fall and Acceleration due to Gravity (g)', description: 'Calculation of g on Earth surface.' },
          { title: 'Mass vs Weight', description: 'Scalar constant mass vs variable force weight.' },
          { title: 'Thrust and Pressure', description: 'Pressure in fluids and buoyancy.' },
          { title: 'Archimedes\' Principle and Relative Density', description: 'Upward buoyant force and floating conditions.' }
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'Work and Energy',
        topics: [
          { title: 'Work Done by a Force', description: 'Scientific concept W = F * s * cos(theta).' },
          { title: 'Forms of Energy', description: 'Kinetic energy Ek = 1/2 mv^2 and Potential energy Ep = mgh.' },
          { title: 'Law of Conservation of Energy', description: 'Transformation between mechanical energies.' },
          { title: 'Rate of Doing Work — Power', description: 'Power P = W / t in Watts and commercial unit kWh.' }
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Sound',
        topics: [
          { title: 'Production and Propagation of Sound', description: 'Compressions and rarefactions in elastic media.' },
          { title: 'Characteristics of Sound Waves', description: 'Frequency, wavelength, amplitude, time period, and speed.' },
          { title: 'Reflection of Sound and Echo', description: 'Reverberation and minimum distance for echo.' },
          { title: 'Applications of Ultrasound and SONAR', description: 'Echocardiography, flaw detection, and depth sounding.' },
          { title: 'Structure of Human Ear', description: 'Auditory mechanism.' }
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Improvement in Food Resources',
        topics: [
          { title: 'Crop Variety Improvement', description: 'Hybridisation and genetic modification for high yield.' },
          { title: 'Crop Production Management', description: 'Nutrient management, manures, bio-fertilisers, and cropping patterns.' },
          { title: 'Crop Protection Management', description: 'Pest, weed, and storage disease management.' },
          { title: 'Animal Husbandry', description: 'Cattle farming, poultry, fish production, and apiculture.' }
        ]
      }
    ]
  },

  // Class 9 Social Science
  {
    student_class: 'Class 9',
    subject: 'Social Science',
    chapters: [
      // History
      { chapter_number: 1, chapter_name: 'History: The French Revolution', topics: [{ title: 'French Society in Late 18th Century', description: 'Three Estates, feudal privileges, and economic crisis.' }, { title: 'Outbreak of the Revolution', description: 'Tennis Court Oath, Storming of Bastille, Declaration of Rights of Man.' }, { title: 'France Becomes a Republic and Reign of Terror', description: 'Jacobins, Robespierre, and Guillotine.' }, { title: 'Directory Rule, Napoleon, and Legacy', description: 'Abolition of slavery and global impact.' }] },
      { chapter_number: 2, chapter_name: 'History: Socialism in Europe and the Russian Revolution', topics: [{ title: 'Age of Social Change', description: 'Liberals, Radicals, and Conservatives.' }, { title: 'Russian Empire and 1905 Revolution', description: 'Tsar Nicholas II, Bloody Sunday, and Duma.' }, { title: 'February and October Revolutions of 1917', description: 'Petrograd Soviet, Lenin, and Bolshevik rise.' }, { title: 'Stalinism and Collectivisation', description: 'Kulaks and five-year agricultural planning.' }] },
      { chapter_number: 3, chapter_name: 'History: Nazism and the Rise of Hitler', topics: [{ title: 'Weimar Republic and Great Depression', description: 'Treaty of Versailles, hyperinflation, and political instability.' }, { title: 'Hitler\'s Rise to Power', description: 'Nazi propaganda, Enabling Act, and total police control.' }, { title: 'Nazi Worldview and Holocaust', description: 'Racial utopia, youth ideology, and concentration camps.' }] },
      { chapter_number: 4, chapter_name: 'History: Forest Society and Colonialism', topics: [{ title: 'Commercial Forestry and Scientific Forestry', description: 'Dietrich Brandis, Indian Forest Act, and plantations.' }, { title: 'Impact on Forest Dwellers and Rebellion', description: 'Shifting cultivation bans and Bastar rebellion 1910.' }] },
      { chapter_number: 5, chapter_name: 'History: Pastoralists in the Modern World', topics: [{ title: 'Pastoral Nomads and Their Movements', description: 'Gaddi, Gujjar, Raika, and Maasai pastoralists.' }, { title: 'Colonial Rules and Impact on Pastoral Life', description: 'Waste Land rules, Criminal Tribes Act, and Grazing Tax.' }] },

      // Geography
      { chapter_number: 6, chapter_name: 'Geography: India — Size and Location', topics: [{ title: 'Location, Extent and Standard Meridian', description: 'Latitudinal/longitudinal extent and 82°30\'E longitude.' }, { title: 'India and the World', description: 'Central location on Indian Ocean and trade routes.' }, { title: 'Neighbouring Countries', description: 'Land borders and maritime neighbours.' }] },
      { chapter_number: 7, chapter_name: 'Geography: Physical Features of India', topics: [{ title: 'Major Physiographic Divisions', description: 'Himalayan Mountains, Northern Plains, Peninsular Plateau, Indian Desert, Coastal Plains, Islands.' }] },
      { chapter_number: 8, chapter_name: 'Geography: Drainage', topics: [{ title: 'Himalayan River Systems', description: 'Indus, Ganga, and Brahmaputra basins.' }, { title: 'Peninsular River Systems', description: 'Narmada, Tapi, Godavari, Krishna, Kaveri.' }, { title: 'Lakes and Economic Importance of Rivers', description: 'Inland drainage, pollution, and conservation.' }] },
      { chapter_number: 9, chapter_name: 'Geography: Climate', topics: [{ title: 'Factors Influencing India\'s Climate', description: 'Latitude, altitude, pressure, jet streams, and El Niño.' }, { title: 'Mechanism of Indian Monsoon', description: 'Seasonal wind reversals, onset, and withdrawal.' }, { title: 'Seasons in India', description: 'Cold, Hot, Advancing Monsoon, and Retreating Monsoon.' }] },
      { chapter_number: 10, chapter_name: 'Geography: Natural Vegetation and Wildlife', topics: [{ title: 'Types of Vegetation', description: 'Tropical evergreen, deciduous, thorn, montane, and mangrove forests.' }, { title: 'Wildlife Conservation', description: 'National parks, biosphere reserves, and Endangered species protection.' }] },
      { chapter_number: 11, chapter_name: 'Geography: Population', topics: [{ title: 'Population Size, Distribution and Density', description: 'Census metrics across Indian states.' }, { title: 'Population Growth and Processes', description: 'Birth rate, death rate, migration, age structure, and National Population Policy.' }] },

      // Political Science
      { chapter_number: 12, chapter_name: 'Civics: What is Democracy? Why Democracy?', topics: [{ title: 'Definition and Key Features of Democracy', description: 'Major decisions by elected leaders, free/fair elections, one person one vote, rule of law.' }, { title: 'Arguments For and Against Democracy', description: 'Accountability vs instability debate.' }] },
      { chapter_number: 13, chapter_name: 'Civics: Constitutional Design', topics: [{ title: 'Democratic Constitution in South Africa', description: 'Apartheid struggle and Mandela leadership.' }, { title: 'Making of the Indian Constitution', description: 'Constituent Assembly role and Preamble philosophy.' }] },
      { chapter_number: 14, chapter_name: 'Civics: Electoral Politics', topics: [{ title: 'Why Elections and Election System in India', description: 'Constituencies, reserved seats, voter lists, nomination, polling, and counting.' }, { title: 'Independent Election Commission', description: 'Code of conduct and free election challenges.' }] },
      { chapter_number: 15, chapter_name: 'Civics: Working of Institutions', topics: [{ title: 'Parliament, Executive and Judiciary', description: 'Mandal Commission decision process, Lok Sabha/Rajya Sabha, PM/Cabinet, Supreme Court judicial review.' }] },
      { chapter_number: 16, chapter_name: 'Civics: Democratic Rights', topics: [{ title: 'Rights in a Democracy and Fundamental Rights', description: 'Right to Equality, Freedom, Against Exploitation, Religious Freedom, Cultural Rights, Constitutional Remedies.' }] },

      // Economics
      { chapter_number: 17, chapter_name: 'Economics: The Story of Village Palampur', topics: [{ title: 'Factors of Production', description: 'Land, labour, physical capital (fixed/working), and human capital.' }, { title: 'Farming Activities and Green Revolution', description: 'HYV seeds, modern tube wells, and chemical land sustainability.' }] },
      { chapter_number: 18, chapter_name: 'Economics: People as Resource', topics: [{ title: 'Human Capital Formation', description: 'Education, skill training, and health investments.' }, { title: 'Economic Activities by Men and Women', description: 'Primary, secondary, and tertiary sectors.' }, { title: 'Unemployment Types', description: 'Seasonal, disguised, and educated unemployment.' }] },
      { chapter_number: 19, chapter_name: 'Economics: Poverty as a Challenge', topics: [{ title: 'Poverty Line and Indicator Dimensions', description: 'Calorie norms, income levels, vulnerability, and social exclusion.' }, { title: 'Anti-Poverty Measures', description: 'MGNREGA, PMRY, SGSY, and public distribution initiatives.' }] },
      { chapter_number: 20, chapter_name: 'Economics: Food Security in India', topics: [{ title: 'Dimensions of Food Security', description: 'Availability, accessibility, and affordability.' }, { title: 'Buffer Stock and Public Distribution System (PDS)', description: 'FCI grain procurement, MSP, and fair price shops.' }] }
    ]
  },

  // Class 9 Languages
  {
    student_class: 'Class 9',
    subject: 'English',
    chapters: [
      { chapter_number: 1, chapter_name: 'The Fun They Had / The Road Not Taken', topics: [{ title: 'Prose & Poem Analysis', description: 'Futuristic education vs decision making.' }] },
      { chapter_number: 2, chapter_name: 'The Sound of Music / Wind', topics: [{ title: 'Evelyn Glennie & Ustad Bismillah Khan', description: 'Perseverance and musical mastery.' }] },
      { chapter_number: 3, chapter_name: 'The Little Girl / Rain on the Roof', topics: [{ title: 'Parental Bonding & Nostalgic Poetry', description: 'Character transformation.' }] },
      { chapter_number: 4, chapter_name: 'Grammar: Tenses, Modals & Concord', topics: [{ title: 'Subject-Verb Agreement', description: 'Standard concord rules.' }, { title: 'Reported Speech', description: 'Statements, commands, and questions.' }] }
    ]
  },
  {
    student_class: 'Class 9',
    subject: 'Hindi',
    chapters: [
      { chapter_number: 1, chapter_name: 'दो बैलों की कथा / कबीर साखियाँ', topics: [{ title: 'प्रेमचंद गद्य एवं कबीर पद विश्लेषण', description: 'भावार्थ एवं चरित्र चित्रण।' }] },
      { chapter_number: 2, chapter_name: 'उपभोक्तावाद की संस्कृति / ल्हासा की ओर', topics: [{ title: 'यात्रा वृत्तांत एवं सामाजिक निबंध', description: 'विषय बोध।' }] },
      { chapter_number: 3, chapter_name: 'हिंदी व्याकरण: उपसर्ग, प्रत्यय, समास एवं अलंकार', topics: [{ title: 'उपसर्ग एवं प्रत्यय सम्बन्धी नियम', description: 'शब्द निर्माण।' }, { title: 'अलंकार भेद (शब्दालंकार व अर्थालंकार)', description: 'अनुप्रास, यमक, उपमा, रूपक।' }] }
    ]
  },
  {
    student_class: 'Class 9',
    subject: 'Sanskrit',
    chapters: [
      { chapter_number: 1, chapter_name: 'भारतीवसन्तगीतिः / स्वर्णकाकः', topics: [{ title: 'पाठान्तर गद्यांश एवं पद्यांश', description: 'संस्कृत अनुवाद एवं प्रश्नोत्तर।' }] },
      { chapter_number: 2, chapter_name: 'संस्कृत व्याकरण: सन्धिः कारकं च', topics: [{ title: 'स्वरसन्धिः (दीर्घ, गुण, वृद्धि, यण्)', description: 'नियम अभ्यास।' }, { title: 'उपपदविभक्तिः एवं कारक नियमाः', description: 'विभक्ति विधान।' }] }
    ]
  },

  // ==========================================
  // CLASS 10
  // ==========================================
  // Class 10 Mathematics
  {
    student_class: 'Class 10',
    subject: 'Mathematics',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Real Numbers',
        topics: [
          { title: 'Exercise 1.1 — Fundamental Theorem of Arithmetic', description: 'Prime factorisation, unique factorisation theorem, finding HCF and LCM.' },
          { title: 'Exercise 1.2 — Proof of Irrationality', description: 'Proving sqrt(2), sqrt(3), sqrt(5) as irrational numbers.' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Polynomials',
        topics: [
          { title: 'Exercise 2.1 — Geometrical Meaning of Zeroes', description: 'Interpreting zeroes from graphs intersecting the x-axis.' },
          { title: 'Exercise 2.2 — Relationship between Zeroes and Coefficients', description: 'Quadratic polynomials sum (alpha+beta = -b/a) and product (alpha*beta = c/a).' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Pair of Linear Equations in Two Variables',
        topics: [
          { title: 'Exercise 3.1 — Graphical Method of Solution', description: 'Consistent, inconsistent, dependent lines (intersecting, parallel, coincident).' },
          { title: 'Exercise 3.2 — Algebraic Methods (Substitution & Elimination)', description: 'Solving pair of linear equations algebraically.' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Quadratic Equations',
        topics: [
          { title: 'Exercise 4.1 — Standard Form of Quadratic Equations', description: 'Identifying quadratic equations ax^2 + bx + c = 0.' },
          { title: 'Exercise 4.2 — Solution by Factorisation', description: 'Splitting middle term method.' },
          { title: 'Exercise 4.3 — Quadratic Formula and Nature of Roots', description: 'Discriminant D = b^2 - 4ac and root nature.' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Arithmetic Progressions',
        topics: [
          { title: 'Exercise 5.1 — AP Terms and Common Difference', description: 'Identifying first term a and common difference d.' },
          { title: 'Exercise 5.2 — nth Term of an AP', description: 'Formula an = a + (n-1)d.' },
          { title: 'Exercise 5.3 — Sum of First n Terms of an AP', description: 'Formula Sn = n/2 [2a + (n-1)d].' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Triangles',
        topics: [
          { title: 'Exercise 6.1 — Similar Figures', description: 'Definition and criteria for similarity.' },
          { title: 'Exercise 6.2 — Basic Proportionality Theorem (Thales Theorem)', description: 'Proving and applying BPT and its converse.' },
          { title: 'Exercise 6.3 — Criteria for Similarity of Triangles', description: 'AAA, SAS, and SSS similarity proofs.' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Coordinate Geometry',
        topics: [
          { title: 'Exercise 7.1 — Distance Formula', description: 'Distance between two points sqrt((x2-x1)^2 + (y2-y1)^2).' },
          { title: 'Exercise 7.2 — Section Formula', description: 'Internal division formula [(m1x2+m2x1)/(m1+m2), (m1y2+m2y1)/(m1+m2)] and midpoint.' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Introduction to Trigonometry',
        topics: [
          { title: 'Exercise 8.1 — Trigonometric Ratios', description: 'Sin, cos, tan, cosec, sec, cot ratios in right triangle.' },
          { title: 'Exercise 8.2 — Trigonometric Values of Specific Angles', description: 'Evaluating expressions for 0°, 30°, 45°, 60°, and 90°.' },
          { title: 'Exercise 8.3 — Trigonometric Identities', description: 'Proving sin^2(A) + cos^2(A) = 1, 1 + tan^2(A) = sec^2(A), 1 + cot^2(A) = cosec^2(A).' }
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Some Applications of Trigonometry',
        topics: [
          { title: 'Exercise 9.1 — Heights and Distances', description: 'Angle of elevation and depression applications.' }
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'Circles',
        topics: [
          { title: 'Exercise 10.1 — Tangent to a Circle', description: 'Point of contact and perpendicular radius theorem.' },
          { title: 'Exercise 10.2 — Number of Tangents from a Point', description: 'Proving equal length of tangents drawn from external point.' }
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Areas Related to Circles',
        topics: [
          { title: 'Exercise 11.1 — Areas of Sector and Segment of a Circle', description: 'Calculations using (theta/360) * pi * r^2 and segment area.' }
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Surface Areas and Volumes',
        topics: [
          { title: 'Exercise 12.1 — Surface Area of Combination of Solids', description: 'Cuboids, cones, cylinders, spheres, and hemispheres.' },
          { title: 'Exercise 12.2 — Volume of Combination of Solids', description: 'Evaluating composite solid volumes.' }
        ]
      },
      {
        chapter_number: 13,
        chapter_name: 'Statistics',
        topics: [
          { title: 'Exercise 13.1 — Mean of Grouped Data', description: 'Direct method, assumed mean method, and step deviation method.' },
          { title: 'Exercise 13.2 — Mode of Grouped Data', description: 'Modal class and formula application.' },
          { title: 'Exercise 13.3 — Median of Grouped Data', description: 'Cumulative frequency curve and median formula.' }
        ]
      },
      {
        chapter_number: 14,
        chapter_name: 'Probability',
        topics: [
          { title: 'Exercise 14.1 — Classical Approach to Probability', description: 'Theoretical probability P(E) = favorable outcomes / total outcomes.' }
        ]
      }
    ]
  },

  // Class 10 Science
  {
    student_class: 'Class 10',
    subject: 'Science',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Chemical Reactions and Equations',
        topics: [
          { title: 'Chemical Equations and Balancing', description: 'Writing skeleton and balanced equations.' },
          { title: 'Combination Reactions', description: 'Exothermic reactions and quicklime slaking.' },
          { title: 'Decomposition Reactions', description: 'Thermal, electrolytic, and photolytic decomposition.' },
          { title: 'Displacement Reactions', description: 'Reactivity series and iron nail in copper sulphate solution.' },
          { title: 'Double Displacement Reactions', description: 'Precipitation reactions and ion exchange.' },
          { title: 'Oxidation and Reduction (Redox)', description: 'Gain/loss of oxygen and hydrogen, oxidizing/reducing agents.' },
          { title: 'Corrosion and Rancidity', description: 'Rusting of iron, silver tarnishing, and antioxidant preservation.' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Acids, Bases and Salts',
        topics: [
          { title: 'Chemical Properties of Acids and Bases', description: 'Reaction with metals, metal carbonates, and hydrogen carbonates.' },
          { title: 'What Do All Acids and All Bases Have in Common?', description: 'H+ and OH- ions in aqueous solutions.' },
          { title: 'How Strong Are Acid or Base Solutions? (pH Scale)', description: 'pH scale 0-14 and everyday importance of pH.' },
          { title: 'Chemicals from Common Salt', description: 'Sodium hydroxide (Chlor-alkali), Bleaching powder, Baking soda, Washing soda.' },
          { title: 'Plaster of Paris and Water of Crystallisation', description: 'Gypsum dehydration and setting.' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Metals and Non-metals',
        topics: [
          { title: 'Physical Properties of Metals and Non-metals', description: 'Malleability, ductility, conductivity, and sonority exceptions.' },
          { title: 'Chemical Properties of Metals', description: 'Reaction with oxygen, water, acids, and salt solutions.' },
          { title: 'How Do Metals and Non-metals React?', description: 'Ionic bond formation and properties of ionic compounds.' },
          { title: 'Occurrence and Extraction of Metals', description: 'Gangue, roaster, calcination, reduction, and refining.' },
          { title: 'Corrosion Prevention', description: 'Anodising, galvanisation, and alloying.' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Carbon and Its Compounds',
        topics: [
          { title: 'Covalent Bonding in Carbon', description: 'Tetravalency, catenation, and electron dot structures.' },
          { title: 'Versatile Nature of Carbon and Homologous Series', description: 'Saturated and unsaturated hydrocarbons, functional groups.' },
          { title: 'Nomenclature of Carbon Compounds', description: 'IUPAC naming conventions.' },
          { title: 'Chemical Properties of Carbon Compounds', description: 'Combustion, oxidation, addition, and substitution reactions.' },
          { title: 'Ethanol and Ethanoic Acid', description: 'Properties, reactions, esterification, and saponification.' },
          { title: 'Soaps and Detergents', description: 'Micelle structure and cleansing action in hard water.' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Life Processes',
        topics: [
          { title: 'Autotrophic Nutrition', description: 'Photosynthesis, stomata mechanism, and chlorophyll requirement.' },
          { title: 'Heterotrophic Nutrition and Human Alimentary Canal', description: 'Digestion enzymes: pepsin, trypsin, lipase, and amylase.' },
          { title: 'Respiration in Humans and Plants', description: 'Aerobic vs anaerobic breakdown of glucose, ATP, and alveoli gas exchange.' },
          { title: 'Transportation in Human Beings', description: 'Heart structure, double circulation, blood pressure, and lymph.' },
          { title: 'Transportation in Plants', description: 'Xylem sap ascent and phloem translocation.' },
          { title: 'Excretion in Humans and Plants', description: 'Nephron structure, urine formation, and dialysis.' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Control and Coordination',
        topics: [
          { title: 'Animals — Nervous System', description: 'Neuron, synapse, and reflex arc pathway.' },
          { title: 'Human Brain Structure', description: 'Forebrain, midbrain, hindbrain, and voluntary/involuntary actions.' },
          { title: 'Plant Hormones and Tropisms', description: 'Phototropism, geotropism, hydrotropism, auxins, gibberellins, cytokinins, and ABA.' },
          { title: 'Hormones in Animals', description: 'Endocrine system: thyroid, adrenal, pancreas, testes, and ovaries.' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'How do Organisms Reproduce?',
        topics: [
          { title: 'Do Organisms Create Exact Copies of Themselves?', description: 'DNA copying importance and variation in evolution.' },
          { title: 'Modes of Asexual Reproduction', description: 'Fission, fragmentation, regeneration, budding, vegetative propagation, and spore formation.' },
          { title: 'Sexual Reproduction in Flowering Plants', description: 'Stamen, pistil, pollination, double fertilisation, and seed formation.' },
          { title: 'Reproductive System in Human Beings', description: 'Male and female anatomy, fertilization, and embryonic nourishment.' },
          { title: 'Reproductive Health and Contraception', description: 'STDs (HIV/AIDS, warts), barrier, chemical, and surgical birth control.' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Heredity',
        topics: [
          { title: 'Accumulation of Variation during Reproduction', description: 'Inheritance principles.' },
          { title: 'Mendel\'s Monohybrid and Dihybrid Crosses', description: 'Law of dominance, segregation, and independent assortment (3:1 and 9:3:3:1).' },
          { title: 'Sex Determination in Humans', description: 'XX and XY chromosome pairing.' }
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Light – Reflection and Refraction',
        topics: [
          { title: 'Reflection of Light by Spherical Mirrors', description: 'Concave/convex mirror ray diagrams and real/virtual image formation.' },
          { title: 'Mirror Formula and Magnification', description: '1/f = 1/v + 1/u and m = -v/u.' },
          { title: 'Refraction of Light and Snell\'s Law', description: 'Refractive index and lateral displacement.' },
          { title: 'Refraction by Spherical Lenses', description: 'Convex and concave lens image formation.' },
          { title: 'Lens Formula, Magnification and Power of Lens', description: '1/f = 1/v - 1/u and P = 1/f in dioptres.' }
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'The Human Eye and the Colourful World',
        topics: [
          { title: 'Power of Accommodation of Human Eye', description: 'Ciliary muscle contraction and focal length adjustment.' },
          { title: 'Defects of Vision and Correction', description: 'Myopia, hypermetropia, presbyopia, and corrective lenses.' },
          { title: 'Refraction of Light through a Glass Prism', description: 'Angle of deviation and spectrum dispersion.' },
          { title: 'Atmospheric Refraction', description: 'Twinkling of stars and advance sunrise/delayed sunset.' },
          { title: 'Scattering of Light and Tyndall Effect', description: 'Blue sky color and red sunset explanation.' }
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Electricity',
        topics: [
          { title: 'Electric Current, Potential and Potential Difference', description: 'I = Q/t and V = W/Q.' },
          { title: 'Ohm\'s Law and Resistance', description: 'V = IR, factors affecting resistance, and resistivity.' },
          { title: 'Resistors in Series and Parallel', description: 'Equivalent resistance Rs = R1+R2+R3 and 1/Rp = 1/R1+1/R2+1/R3.' },
          { title: 'Joule\'s Heating Effect of Electric Current', description: 'H = I^2 R t and application in fuse, electric iron, and bulb.' },
          { title: 'Electric Power', description: 'P = VI = I^2 R = V^2 / R and commercial unit 1 kWh = 3.6 x 10^6 J.' }
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Magnetic Effects of Electric Current',
        topics: [
          { title: 'Magnetic Field and Field Lines', description: 'Bar magnet field properties.' },
          { title: 'Magnetic Field due to Current-Carrying Conductors', description: 'Straight wire, circular loop, and solenoid.' },
          { title: 'Right-Hand Thumb Rule and Fleming\'s Left-Hand Rule', description: 'Force on a current-carrying conductor in a magnetic field.' },
          { title: 'Domestic Electric Circuits', description: 'Live, neutral, earth wires, short circuit, and overloading protection.' }
        ]
      },
      {
        chapter_number: 13,
        chapter_name: 'Our Environment',
        topics: [
          { title: 'Ecosystem and Its Components', description: 'Biotic and abiotic factors, producers, consumers, and decomposers.' },
          { title: 'Food Chains and Food Webs', description: 'Flow of energy and 10% energy law.' },
          { title: 'Biological Magnification', description: 'Pesticide accumulation across trophic levels.' },
          { title: 'Ozone Layer Depletion and Waste Management', description: 'CFC impact, biodegradable vs non-biodegradable waste.' }
        ]
      }
    ]
  },

  // Class 10 Social Science
  {
    student_class: 'Class 10',
    subject: 'Social Science',
    chapters: [
      // History
      { chapter_number: 1, chapter_name: 'History: The Rise of Nationalism in Europe', topics: [{ title: 'Frederic Sorrieu Vision and French Revolution Impact', description: 'Civil Code 1804 and spread of liberal nationalism.' }, { title: 'Making of Nationalism and Liberalism', description: 'Zollverein customs union and 1815 conservatism.' }, { title: 'Age of Revolutions (1830-1848)', description: 'Greek war of independence and Romanticism.' }, { title: 'Unification of Germany and Italy', description: 'Bismarck blood/iron policy, Cavour, and Garibaldi.' }, { title: 'Visualising the Nation and Imperialism', description: 'Allegories Marianne and Germania, Balkan crisis.' }] },
      { chapter_number: 2, chapter_name: 'History: Nationalism in India', topics: [{ title: 'First World War, Khilafat, and Non-Cooperation', description: 'Satyagraha, Rowlatt Act, Jallianwala Bagh massacre.' }, { title: 'Differing Strands within the Movement', description: 'Movement in towns, countryside (Awadh kisans), and tribal Gudem Hills revolt.' }, { title: 'Towards Civil Disobedience', description: 'Simon Commission, Salt March to Dandi, and Round Table Conferences.' }, { title: 'Sense of Collective Belonging', description: 'Bharat Mata icon, folklore, and reinterpretation of history.' }] },
      { chapter_number: 3, chapter_name: 'History: The Making of a Global World', topics: [{ title: 'Pre-modern Trade and Silk Routes', description: 'Food travel (spaghetti/potato) and conquest/disease.' }, { title: '19th Century World Economy (1820-1914)', description: 'Corn Laws abolition, indentured labour migration, and rinderpest cattle plague.' }, { title: 'Inter-war Economy and Great Depression', description: 'US mass production (Henry Ford) and global debt collapse.' }, { title: 'Rebuilding World Economy — Bretton Woods System', description: 'IMF, World Bank creation, and post-war monetary order.' }] },
      { chapter_number: 4, chapter_name: 'History: The Age of Industrialisation', topics: [{ title: 'Before the Industrial Revolution (Proto-industrialisation)', description: 'Merchant guilds and countryside weavers.' }, { title: 'Hand Labour and Steam Power', description: 'Victorian Britain labor preference and Spinning Jenny revolt.' }, { title: 'Industrialisation in the Colonies', description: 'East India Company gomasthas and Indian factory pioneers (Tata, Birles).' }] },
      { chapter_number: 5, chapter_name: 'History: Print Culture and the Modern World', topics: [{ title: 'First Printed Books in East Asia', description: 'Woodblock printing in China, Japan (Ukiyo-e), and Korea.' }, { title: 'Print Comes to Europe and Gutenberg Press', description: 'Moveable metal type and Protestant Reformation (Martin Luther).' }, { title: 'Print Revolution and Public Sphere', description: 'Reading mania, French Revolution link, and 19th century children/women readers.' }, { title: 'Print in India and Censorship', description: 'Vernacular press, religious reform debates, and Vernacular Press Act 1878.' }] },

      // Geography
      { chapter_number: 6, chapter_name: 'Geography: Resources and Development', topics: [{ title: 'Classification and Development of Resources', description: 'Biotic, abiotic, renewable, non-renewable, potential, and stock.' }, { title: 'Resource Planning in India', description: 'Conservation principles and Agenda 21.' }, { title: 'Land Resources and Land Use Pattern', description: 'Degradation causes and soil profile types (Alluvial, Black, Red/Yellow, Laterite, Arid, Forest).' }] },
      { chapter_number: 7, chapter_name: 'Geography: Forest and Wildlife Resources', topics: [{ title: 'Flora and Fauna Classification', description: 'IUCN endangered, vulnerable, and rare species categories.' }, { title: 'Conservation Measures in India', description: 'Project Tiger, Joint Forest Management (JFM), Reserved and Protected forests.' }] },
      { chapter_number: 8, chapter_name: 'Geography: Water Resources', topics: [{ title: 'Water Scarcity and Management', description: 'Multi-purpose river valley projects and dam advantages/disadvantages.' }, { title: 'Rainwater Harvesting Systems', description: 'Guls/Kuls, Khadins, Johads, and rooftop harvesting.' }] },
      { chapter_number: 9, chapter_name: 'Geography: Agriculture', topics: [{ title: 'Types of Farming and Cropping Pattern', description: 'Primitive subsistence, intensive subsistence, commercial, Rabi, Kharif, and Zaid.' }, { title: 'Major Crops and Technological Reforms', description: 'Food crops, non-food crops, Bhoodan-Gramdan, and institutional reforms.' }] },
      { chapter_number: 10, chapter_name: 'Geography: Minerals and Energy Resources', topics: [{ title: 'Modes of Occurrence of Minerals', description: 'Ferrous, non-ferrous, non-metallic, and rock minerals.' }, { title: 'Conventional and Non-Conventional Energy Sources', description: 'Coal, petroleum, natural gas, hydro, solar, wind, biogas, and nuclear energy.' }] },
      { chapter_number: 11, chapter_name: 'Geography: Manufacturing Industries', topics: [{ title: 'Importance and Location of Industries', description: 'Agro-based (textiles, sugar) and Mineral-based (iron/steel, aluminum, chemical, cement).' }, { title: 'Industrial Pollution and Environmental Degradation', description: 'Air, water, thermal, noise pollution control.' }] },
      { chapter_number: 12, chapter_name: 'Geography: Life Lines of National Economy', topics: [{ title: 'Transport Systems', description: 'Roadways, railways, pipelines, waterways, and airways.' }, { title: 'Communication, International Trade, and Tourism', description: 'Balance of trade, digital communication, and economic tourism.' }] },

      // Political Science
      { chapter_number: 13, chapter_name: 'Civics: Power Sharing', topics: [{ title: 'Case Studies — Belgium and Sri Lanka', description: 'Ethnic composition, accommodation policy vs Sinhala majoritarianism.' }, { title: 'Why Power Sharing is Desirable', description: 'Prudential and moral reasons.' }, { title: 'Forms of Power Sharing', description: 'Horizontal (executive/legislative/judiciary), vertical (federal levels), social groups, and political parties.' }] },
      { chapter_number: 14, chapter_name: 'Civics: Federalism', topics: [{ title: 'What is Federalism and Key Features', description: 'Coming together vs holding together federations.' }, { title: 'What Makes India a Federal Country?', description: 'Union List, State List, Concurrent List, and Residuary subjects.' }, { title: 'Decentralisation in India', description: '73rd and 74th Constitutional Amendments (Panchayati Raj and Municipalities).' }] },
      { chapter_number: 15, chapter_name: 'Civics: Gender, Religion and Caste', topics: [{ title: 'Gender and Politics', description: 'Public/private divide, women political representation, and Equal Remuneration Act.' }, { title: 'Religion, Communalism and Secular State', description: 'Communal politics and constitutional secular safeguards.' }, { title: 'Caste and Politics', description: 'Caste in politics vs politics in caste.' }] },
      { chapter_number: 16, chapter_name: 'Civics: Political Parties', topics: [{ title: 'Why Do We Need Political Parties?', description: 'Functions, necessity, single, two, and multi-party systems.' }, { title: 'National and State Parties in India', description: 'Recognition criteria by Election Commission.' }, { title: 'Challenges to Political Parties and Reforms', description: 'Anti-defection law, affidavit submission, and internal democracy.' }] },
      { chapter_number: 17, chapter_name: 'Civics: Outcomes of Democracy', topics: [{ title: 'Evaluating Democratic Outcomes', description: 'Accountable, responsive, and legitimate government.' }, { title: 'Economic Growth, Poverty Reduction, and Social Diversity', description: 'Dignity and freedom of citizens.' }] },

      // Economics
      { chapter_number: 18, chapter_name: 'Economics: Development', topics: [{ title: 'What Development Promises — Different Goals', description: 'Income and other goals (freedom, equality, security).' }, { title: 'National Income and Per Capita Income', description: 'World Bank classification and UNDP Human Development Index (HDI).' }, { title: 'Sustainability of Development', description: 'Groundwater depletion and non-renewable resource management.' }] },
      { chapter_number: 19, chapter_name: 'Economics: Sectors of the Indian Economy', topics: [{ title: 'Primary, Secondary and Tertiary Sectors', description: 'GDP contribution vs employment share.' }, { title: 'Organised vs Unorganised Sectors', description: 'Employment security and labour protection laws.' }, { title: 'Public vs Private Sectors', description: 'Asset ownership and social welfare goals.' }] },
      { chapter_number: 20, chapter_name: 'Economics: Money and Credit', topics: [{ title: 'Money as a Medium of Exchange', description: 'Double coincidence of wants and currency notes.' }, { title: 'Modern Forms of Money and Bank Loan Activities', description: 'Deposits, credit creation, and Reserve Bank of India (RBI) supervision.' }, { title: 'Formal vs Informal Credit', description: 'Interest rates, collateral, and Self-Help Groups (SHGs) for rural poor.' }] },
      { chapter_number: 21, chapter_name: 'Economics: Globalisation and the Indian Economy', topics: [{ title: 'Production Across Countries and MNCs', description: 'Foreign investment and joint ventures.' }, { title: 'Foreign Trade and Integration of Markets', description: 'Import tariffs, trade barriers, and WTO policy.' }, { title: 'Impact of Globalisation in India', description: 'SEZs, small producer challenges, and fair globalisation.' }] },
      { chapter_number: 22, chapter_name: 'Economics: Consumer Rights', topics: [{ title: 'Consumer Movement and Consumer Protection Act (COPRA)', description: 'Right to Safety, Information, Choice, Redressal, and Consumer Courts.' }] }
    ]
  },

  // Class 10 Languages
  {
    student_class: 'Class 10',
    subject: 'English',
    chapters: [
      { chapter_number: 1, chapter_name: 'A Letter to God / Dust of Snow / Fire and Ice', topics: [{ title: 'Lencho\'s Faith & Frost\'s Poetry', description: 'Irony of Lencho and symbolic nature poetry.' }] },
      { chapter_number: 2, chapter_name: 'Nelson Mandela: Long Walk to Freedom / A Tiger in the Zoo', topics: [{ title: 'Apartheid Victory & Captivity vs Freedom', description: 'Autobiographical speech analysis.' }] },
      { chapter_number: 3, chapter_name: 'Two Stories about Flying / How to Tell Wild Animals', topics: [{ title: 'First Flight & Black Aeroplane', description: 'Overcoming fear and mysterious courage.' }] },
      { chapter_number: 4, chapter_name: 'Grammar: Tenses, Modals & Reported Speech', topics: [{ title: 'Reported Speech Transformations', description: 'Direct to indirect speech rules.' }, { title: 'Determiners & Modals Practice', description: 'Editing and error correction exercises.' }] }
    ]
  },
  {
    student_class: 'Class 10',
    subject: 'Hindi Course A',
    chapters: [
      { chapter_number: 1, chapter_name: 'नेताजी का चश्मा / सूरदास के पद', topics: [{ title: 'स्वयं प्रकाश गद्य एवं सूरदास भ्रमरगीत पद', description: 'देशभक्ति सन्देश एवं भक्ति भाव।' }] },
      { chapter_number: 2, chapter_name: 'बालगोबिन भगत / रामलक्ष्मणपरशुराम संवाद', topics: [{ title: 'रामवृक्ष बेनीपुरी चित्र एवं तुलसीदास काव्य', description: 'चरित्र एवं संवाद कौशल।' }] },
      { chapter_number: 3, chapter_name: 'व्याकरण: रचना के आधार पर वाक्य भेद, वाच्य एवं पद परिचय', topics: [{ title: 'सरल, संयुक्त एवं मिश्र वाक्य रूपांतरण', description: 'वाक्य भेद विधान।' }, { title: 'कर्तृवाच्य, कर्मवाच्य एवं भाववाच्य', description: 'वाच्य परिवर्तन।' }, { title: 'पद परिचय विधान', description: 'संज्ञा, सर्वनाम, विशेषण परिचय।' }] }
    ]
  },
  {
    student_class: 'Class 10',
    subject: 'Hindi Course B',
    chapters: [
      { chapter_number: 1, chapter_name: 'बडे भाई साहब / कबीर साखी', topics: [{ title: 'प्रेमचंद कहानी एवं कबीर साखी भावार्थ', description: 'बाल मनोविज्ञान एवं जीवन मूल्य।' }] },
      { chapter_number: 2, chapter_name: 'डायरी का एक पन्ना / मीरा के पद', topics: [{ title: 'सताराम सेकसरिया संस्मरण एवं मीरा पद', description: 'स्वतंत्रता संग्राम दृश्य एवं भक्ति।' }] },
      { chapter_number: 3, chapter_name: 'व्याकरण: पदबंध, वाक्य रूपांतरण एवं समास', topics: [{ title: 'संज्ञा, सर्वनाम, विशेषण पदबंध भेद', description: 'पदबंध पहचान।' }, { title: 'रचना अनुसार वाक्य रूपांतरण', description: 'अभ्यास कार्याणि।' }] }
    ]
  },
  {
    student_class: 'Class 10',
    subject: 'Sanskrit',
    chapters: [
      { chapter_number: 1, chapter_name: 'शुचिपर्यावरणम् / बुद्धिर्बलवती सदा', topics: [{ title: 'पर्यावरण चेतना एवं कथा वाचन', description: 'संस्कृत अनुवाद एवं श्लोकार्थ।' }] },
      { chapter_number: 2, chapter_name: 'संस्कृत व्याकरण: सन्धिः, समासः, प्रत्ययाः च', topics: [{ title: 'व्यञ्जन एवं विसर्ग सन्धि नियम', description: 'अभ्यास प्रश्नोत्तर।' }, { title: 'अव्ययीभाव, तत्पुरुष, बहुव्रीहि समास भेद', description: 'समास विग्रह।' }] }
    ]
  }
];

/**
 * Executes idempotent seeding of syllabus_topics and syllabus_topic_resources.
 */
export async function runSeedSyllabus(supabaseClient) {
  let totalChaptersCreated = 0;
  let totalTopicsCreated = 0;
  let totalResourcesMapped = 0;

  console.log('Starting 2026–27 Syllabus Data Seed...');

  // Fetch all existing resources to match with topics
  const { data: existingResources, error: resErr } = await supabaseClient
    .from('learning_resources')
    .select('id, student_class, subject, title, chapter_id, medium');

  if (resErr) {
    console.error('Error fetching existing learning resources:', resErr);
  }

  const resourceList = existingResources || [];

  for (const subjectGroup of SYLLABUS_2026_DATA) {
    const { student_class, subject, chapters } = subjectGroup;

    for (const ch of chapters) {
      // 1. Ensure or find chapter in 'chapters' table
      const { data: existingCh, error: chFindErr } = await supabaseClient
        .from('chapters')
        .select('id')
        .eq('student_class', student_class)
        .eq('subject', subject)
        .eq('chapter_number', ch.chapter_number)
        .single();

      let chapterId = existingCh?.id;

      if (!chapterId) {
        const { data: newCh, error: chInsertErr } = await supabaseClient
          .from('chapters')
          .insert({
            student_class: student_class,
            subject: subject,
            chapter_number: ch.chapter_number,
            chapter_name: ch.chapter_name,
            display_order: ch.chapter_number,
            is_active: true
          })
          .select('id')
          .single();

        if (chInsertErr) {
          console.error(`Error inserting chapter ${ch.chapter_number} (${ch.chapter_name}) for ${student_class} ${subject}:`, chInsertErr);
          continue;
        }
        chapterId = newCh?.id;
        totalChaptersCreated++;
      }

      if (!chapterId) continue;

      // 2. Insert topics into 'syllabus_topics'
      let topicOrder = 1;
      for (const t of ch.topics) {
        // Check if topic already exists to keep seed idempotent
        const { data: existingTopic } = await supabaseClient
          .from('syllabus_topics')
          .select('id')
          .eq('chapter_id', chapterId)
          .eq('title', t.title)
          .single();

        let topicId = existingTopic?.id;

        if (!topicId) {
          const { data: newTopic, error: topErr } = await supabaseClient
            .from('syllabus_topics')
            .insert({
              chapter_id: chapterId,
              title: t.title,
              description: t.description || null,
              display_order: topicOrder,
              is_active: true
            })
            .select('id')
            .single();

          if (topErr) {
            console.error(`Error inserting topic "${t.title}":`, topErr);
            continue;
          }
          topicId = newTopic?.id;
          totalTopicsCreated++;
        }

        topicOrder++;

        // 3. Match existing learning resources to this topic
        if (topicId && resourceList.length > 0) {
          // Find matching resources for this class, subject, and chapter
          const matchingRes = resourceList.filter(r => {
            const classMatch = !r.student_class || r.student_class === student_class || `Class ${r.student_class}` === student_class || r.student_class === student_class.replace('Class ', '');
            const subMatch = !r.subject || r.subject.toLowerCase() === subject.toLowerCase();
            const chMatch = r.chapter_id === chapterId || (r.title && r.title.toLowerCase().includes(`chapter ${ch.chapter_number}`));
            return classMatch && subMatch && chMatch;
          });

          let resOrder = 1;
          for (const res of matchingRes) {
            const { error: mapErr } = await supabaseClient
              .from('syllabus_topic_resources')
              .upsert({
                topic_id: topicId,
                resource_id: res.id,
                display_order: resOrder
              }, { onConflict: 'topic_id, resource_id' });

            if (!mapErr) {
              totalResourcesMapped++;
              resOrder++;
            }
          }
        }
      }
    }
  }

  console.log('2026 Syllabus Seed Complete:');
  console.log(`- Chapters processed/created: ${totalChaptersCreated}`);
  console.log(`- Syllabus topics created: ${totalTopicsCreated}`);
  console.log(`- Resource mappings created: ${totalResourcesMapped}`);

  return {
    chaptersCreated: totalChaptersCreated,
    topicsCreated: totalTopicsCreated,
    resourcesMapped: totalResourcesMapped
  };
}

// CLI runner
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && currentFilePath === process.argv[1]) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder';
  const supabase = createClient(supabaseUrl, supabaseKey);
  runSeedSyllabus(supabase).catch(err => {
    console.error('Failed to run syllabus seed:', err);
  });
}

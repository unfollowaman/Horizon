import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

/**
 * Authoritative 2026-27 Syllabus Data structure from SYLLABUS_2026_DATA_AUDIT.pdf
 */
export const SYLLABUS_2026_DATA = [
  // ==========================================
  // CLASS 8
  // ==========================================
  {
    student_class: '8',
    subject: 'Mathematics',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Rational Numbers',
        topics: [
          { title: 'Exercise 1.1', description: 'Covers properties of rational numbers including closure, commutativity, associativity, role of zero and one, and distributivity of multiplication over addition.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Linear Equations in One Variable',
        topics: [
          { title: 'Exercise 2.1', description: 'Covers solving linear equations having expressions with variables on one side and numbers on the other side.', topic_type: 'exercise' },
          { title: 'Exercise 2.2', description: 'Covers solving equations having the variable on both sides and formulating linear models from word problems.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Understanding Quadrilaterals',
        topics: [
          { title: 'Exercise 3.1', description: 'Covers classification of polygons (convex, concave, regular, irregular) and the angle sum property of closed polygons.', topic_type: 'exercise' },
          { title: 'Exercise 3.2', description: 'Covers the sum of the measures of the exterior angles of a polygon (360°) and calculating sides of regular polygons.', topic_type: 'exercise' },
          { title: 'Exercise 3.3', description: 'Covers properties of parallelograms, opposite sides, opposite angles, and bisecting diagonals.', topic_type: 'exercise' },
          { title: 'Exercise 3.4', description: 'Covers definitions and properties of special quadrilaterals: rhombus, rectangle, square, trapezium, and kite.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Data Handling',
        topics: [
          { title: 'Exercise 4.1', description: 'Covers organizing raw data, constructing grouped frequency distribution tables, and drawing histograms.', topic_type: 'exercise' },
          { title: 'Exercise 4.2', description: 'Covers interpretation and construction of circle graphs (pie charts) and fundamental concepts of probability and chance.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Squares and Square Roots',
        topics: [
          { title: 'Exercise 5.1', description: 'Covers properties of square numbers, ending digits, patterns in squares, and Pythagorean triplets.', topic_type: 'exercise' },
          { title: 'Exercise 5.2', description: 'Covers finding squares of two-digit numbers using identity patterns without direct multiplication.', topic_type: 'exercise' },
          { title: 'Exercise 5.3', description: 'Covers finding square roots of whole numbers using repeated subtraction and prime factorisation methods.', topic_type: 'exercise' },
          { title: 'Exercise 5.4', description: 'Covers finding square roots of whole numbers and decimal numbers using the long division method.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Cubes and Cube Roots',
        topics: [
          { title: 'Exercise 6.1', description: 'Covers properties of cube numbers, patterns in consecutive odd numbers, and finding smallest multiplying factors for perfect cubes.', topic_type: 'exercise' },
          { title: 'Exercise 6.2', description: 'Covers finding cube roots of numbers using prime factorisation and estimation methods.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Comparing Quantities',
        topics: [
          { title: 'Exercise 7.1', description: 'Covers ratios, percentage conversion, and percentage increase or decrease in practical contexts.', topic_type: 'exercise' },
          { title: 'Exercise 7.2', description: 'Covers commercial transactions: discounts, marked price, profit and loss, cost price, selling price, and sales tax/GST.', topic_type: 'exercise' },
          { title: 'Exercise 7.3', description: 'Covers derivation and application of compound interest formulas for annual and semi-annual compounding.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Algebraic Expressions and Identities',
        topics: [
          { title: 'Exercise 8.1', description: 'Covers identifying terms, coefficients, monomials, binomials, polynomials, and addition/subtraction of expressions.', topic_type: 'exercise' },
          { title: 'Exercise 8.2', description: 'Covers multiplication of monomials by monomials and monomials by polynomials.', topic_type: 'exercise' },
          { title: 'Exercise 8.3', description: 'Covers multiplication of binomials by binomials and binomials by trinomials.', topic_type: 'exercise' },
          { title: 'Exercise 8.4', description: 'Covers standard algebraic identities ((a+b)², (a-b)², a²-b², (x+a)(x+b)) and their verification.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Mensuration',
        topics: [
          { title: 'Exercise 9.1', description: 'Covers calculating areas of trapeziums and general polygons using triangulation.', topic_type: 'exercise' },
          { title: 'Exercise 9.2', description: 'Covers surface area of 3D solids: cuboids, cubes, and right circular cylinders.', topic_type: 'exercise' },
          { title: 'Exercise 9.3', description: 'Covers volume calculations for cuboids, cubes, and cylinders in practical real-world problems.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'Exponents and Powers',
        topics: [
          { title: 'Exercise 10.1', description: 'Covers powers with negative exponents and laws of exponents.', topic_type: 'exercise' },
          { title: 'Exercise 10.2', description: 'Covers expressing very large and very small numbers in standard scientific notation.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Direct and Inverse Proportions',
        topics: [
          { title: 'Exercise 11.1', description: 'Covers direct proportion relationships, constant ratios (x/y = k), and solving proportional problems.', topic_type: 'exercise' },
          { title: 'Exercise 11.2', description: 'Covers inverse proportion relationships, constant product (x · y = k), and applications.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Factorisation',
        topics: [
          { title: 'Exercise 12.1', description: 'Covers factorisation using common factors and regrouping terms.', topic_type: 'exercise' },
          { title: 'Exercise 12.2', description: 'Covers factorisation using standard algebraic identities and expressions in the form (x² + ax + b).', topic_type: 'exercise' },
          { title: 'Exercise 12.3', description: 'Covers division of algebraic expressions: monomial by monomial, polynomial by monomial, and polynomial by polynomial.', topic_type: 'exercise' },
        ]
      },
      {
        chapter_number: 13,
        chapter_name: 'Introduction to Graphs',
        topics: [
          { title: 'Exercise 13.1', description: 'Covers reading and constructing line graphs, bar graphs, and linear representations of continuous data.', topic_type: 'exercise' },
          { title: 'Exercise 13.2', description: 'Covers plotting coordinate points on a Cartesian grid and linear graphs showing direct variations.', topic_type: 'exercise' },
        ]
      }
    ]
  },
  {
    student_class: '8',
    subject: 'Science',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Crop Production and Management',
        topics: [
          { title: 'Agricultural Practices and Soil Preparation', topic_type: 'topic' },
          { title: 'Sowing, Seeds Quality, and Seed Drills', topic_type: 'topic' },
          { title: 'Adding Manure and Fertilisers', topic_type: 'topic' },
          { title: 'Irrigation Methods: Traditional and Modern Systems', topic_type: 'topic' },
          { title: 'Protection from Weeds and Harvesting', topic_type: 'topic' },
          { title: 'Storage of Food Grains and Animal Husbandry', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Microorganisms: Friend and Foe',
        topics: [
          { title: 'Major Groups of Microorganisms', topic_type: 'topic' },
          { title: 'Friendly Microorganisms and Commercial Uses', topic_type: 'topic' },
          { title: 'Medicinal Use of Microorganisms: Antibiotics and Vaccines', topic_type: 'topic' },
          { title: 'Harmful Microorganisms: Human, Animal and Plant Pathogens', topic_type: 'topic' },
          { title: 'Food Preservation Methods', topic_type: 'topic' },
          { title: 'Nitrogen Fixation and the Nitrogen Cycle', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Coal and Petroleum',
        topics: [
          { title: 'Exhaustible vs. Inexhaustible Natural Resources', topic_type: 'topic' },
          { title: 'Coal: Formation, Carbonisation, and By-products', topic_type: 'topic' },
          { title: 'Petroleum: Refining and Fractional Distillation', topic_type: 'topic' },
          { title: 'Natural Gas and Compressed Natural Gas (CNG)', topic_type: 'topic' },
          { title: 'Conservation of Fossil Fuels and PCRA Guidelines', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Combustion and Flame',
        topics: [
          { title: 'Combustion and Ignition Temperature', topic_type: 'topic' },
          { title: 'Inflammable Substances and Fire Control', topic_type: 'topic' },
          { title: 'Types of Combustion: Rapid, Spontaneous, Explosion', topic_type: 'topic' },
          { title: 'Structure of a Flame and Zones of Combustion', topic_type: 'topic' },
          { title: 'Fuel Efficiency, Calorific Value, and Environmental Harm', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Conservation of Plants and Animals',
        topics: [
          { title: 'Deforestation and its Consequences', topic_type: 'topic' },
          { title: 'Biosphere Reserves, National Parks, and Wildlife Sanctuaries', topic_type: 'topic' },
          { title: 'Flora, Fauna, and Endemic Species', topic_type: 'topic' },
          { title: 'Red Data Book and Wildlife Conservation', topic_type: 'topic' },
          { title: 'Migration and Reforestation', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Reproduction in Animals',
        topics: [
          { title: 'Modes of Reproduction: Sexual vs. Asexual', topic_type: 'topic' },
          { title: 'Male and Female Reproductive Organs', topic_type: 'topic' },
          { title: 'Fertilisation: Internal vs. External and IVF', topic_type: 'topic' },
          { title: 'Development of Embryo and Viviparous/Oviparous Animals', topic_type: 'topic' },
          { title: 'Metamorphosis in Frogs and Insects', topic_type: 'topic' },
          { title: 'Asexual Reproduction: Budding and Binary Fission', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Reaching the Age of Adolescence',
        topics: [
          { title: 'Adolescence, Puberty, and Physical Changes', topic_type: 'topic' },
          { title: 'Secondary Sexual Characteristics', topic_type: 'topic' },
          { title: 'Endocrine Glands and Hormonal Functions', topic_type: 'topic' },
          { title: 'Reproductive Phase of Life in Humans and Menstruation', topic_type: 'topic' },
          { title: 'Sex Determination in the Unborn Child', topic_type: 'topic' },
          { title: 'Reproductive Health, Nutritional Needs, and Personal Hygiene', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Force and Pressure',
        topics: [
          { title: 'Force as a Push or Pull and Interaction', topic_type: 'topic' },
          { title: 'Effects of Force on Motion and Shape', topic_type: 'topic' },
          { title: 'Contact Forces: Muscular and Friction', topic_type: 'topic' },
          { title: 'Non-contact Forces: Magnetic, Electrostatic, Gravitational', topic_type: 'topic' },
          { title: 'Pressure: Force per Unit Area', topic_type: 'topic' },
          { title: 'Pressure Exerted by Liquids and Gases', topic_type: 'topic' },
          { title: 'Atmospheric Pressure and Measurement', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Friction',
        topics: [
          { title: 'Force of Friction and Factors Affecting Friction', topic_type: 'topic' },
          { title: 'Static, Sliding, and Rolling Friction', topic_type: 'topic' },
          { title: 'Friction as a Necessary Evil', topic_type: 'topic' },
          { title: 'Methods of Increasing and Reducing Friction', topic_type: 'topic' },
          { title: 'Fluid Friction and Streamlined Shapes', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'Sound',
        topics: [
          { title: 'Sound Produced by Vibrating Bodies', topic_type: 'topic' },
          { title: 'Sound Produced by Humans (Larynx/Voice Box)', topic_type: 'topic' },
          { title: 'Propagation of Sound Through Media', topic_type: 'topic' },
          { title: 'Structure and Working of the Human Ear', topic_type: 'topic' },
          { title: 'Amplitude, Time Period, and Frequency', topic_type: 'topic' },
          { title: 'Loudness, Pitch, and Audible/Inaudible Frequencies', topic_type: 'topic' },
          { title: 'Noise Pollution, Effects, and Control Measures', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Chemical Effects of Electric Current',
        topics: [
          { title: 'Electrical Conductivity of Liquids', topic_type: 'topic' },
          { title: 'Chemical Effects of Current and Electrolysis', topic_type: 'topic' },
          { title: 'Electroplating: Process, Applications, and Uses', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Some Natural Phenomena',
        topics: [
          { title: 'Lightning and Charging by Rubbing', topic_type: 'topic' },
          { title: 'Types of Charges and Electroscope Working', topic_type: 'topic' },
          { title: 'Lightning Safety and Lightning Conductors', topic_type: 'topic' },
          { title: 'Earthquakes: Causes, Fault Zones, and Seismographs', topic_type: 'topic' },
          { title: 'Protection During Earthquakes', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 13,
        chapter_name: 'Light',
        topics: [
          { title: 'Reflection of Light and Laws of Reflection', topic_type: 'topic' },
          { title: 'Regular and Diffused Reflection', topic_type: 'topic' },
          { title: 'Multiple Reflection and Periscopes/Kaleidoscopes', topic_type: 'topic' },
          { title: 'Dispersion of Light and Rainbow Formation', topic_type: 'topic' },
          { title: 'Structure and Working of the Human Eye', topic_type: 'topic' },
          { title: 'Defects of Vision and Care of Eyes', topic_type: 'topic' },
          { title: 'Visually Impaired System and Braille Script', topic_type: 'topic' }
        ]
      }
    ]
  },
  {
    student_class: '8',
    subject: 'Social Science',
    chapters: [
      // History (Our Pasts-III)
      { chapter_number: 1, chapter_name: 'Introduction: How, When and Where', topics: [{ title: 'Importance of Dates and Periodisation in Indian History', topic_type: 'topic' }, { title: 'Colonial Records and Official Archives', topic_type: 'topic' }, { title: 'Surveys and Alternative Historical Sources', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'From Trade to Territory: The Company Establishes Power', topics: [{ title: 'East India Company Comes East and Trade Rivalries', topic_type: 'topic' }, { title: 'Battle of Plassey (1757) and Battle of Buxar (1764)', topic_type: 'topic' }, { title: 'Company Expansion: Subsidiary Alliance and Doctrine of Lapse', topic_type: 'topic' }, { title: 'Setting up a New Administration and Company Army', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'Ruling the Countryside', topics: [{ title: 'Company as Diwan and Land Revenue Systems', topic_type: 'topic' }, { title: 'Permanent Settlement, Mahalwari, and Ryotwari Systems', topic_type: 'topic' }, { title: 'Crops for Europe: Cultivation of Indigo', topic_type: 'topic' }, { title: 'The "Blue Rebellion" and Aftermath', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'Tribals, Dikus and the Vision of a Golden Age', topics: [{ title: 'Tribal Livelihoods: Jhum Cultivators, Hunters, Herders', topic_type: 'topic' }, { title: 'Impact of Colonial Rule on Tribal Chiefs and Forest Laws', topic_type: 'topic' }, { title: 'Birsa Munda and the Tribal Movement in Chota Nagpur', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'When People Rebel 1857 and After', topics: [{ title: 'Policies and Discontent: Nawabs, Peasants, Sepoys', topic_type: 'topic' }, { title: 'Mutiny Becomes a Popular Rebellion (Meerut to Delhi)', topic_type: 'topic' }, { title: 'Spread of Revolt: Key Leaders and Centers', topic_type: 'topic' }, { title: 'Suppression of Revolt and Administrative Changes After 1858', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'Civilising the "Native", Educating the Nation', topics: [{ title: 'Orientalists vs. Anglicists Discourse (Macaulay)', topic_type: 'topic' }, { title: 'Wood\'s Despatch (1854) and Higher Education', topic_type: 'topic' }, { title: 'Vernacular Pathshalas and Report of William Adam', topic_type: 'topic' }, { title: 'National Education Vision: Tagore and Rabindranath Tagore', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'Women, Caste and Reform', topics: [{ title: 'Working for Change: Sati Abolition and Widow Remarriage', topic_type: 'topic' }, { title: 'Education for Girls and Women Reformers', topic_type: 'topic' }, { title: 'Caste Reformers: Phule, Periyar, Ambedkar, Sri Narayana Guru', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'The Making of the National Movement: 1870s-1947', topics: [{ title: 'Emergence of Nationalism and Early Political Associations', topic_type: 'topic' }, { title: 'Moderate vs. Radical Phases and Partition of Bengal (1905)', topic_type: 'topic' }, { title: 'Mass Nationalism: Gandhi, Non-Cooperation, Civil Disobedience', topic_type: 'topic' }, { title: 'Quit India Movement and Path to Independence and Partition', topic_type: 'topic' }] },

      // Geography (Resources and Development)
      { chapter_number: 9, chapter_name: 'Resources', topics: [{ title: 'Definition, Utility, and Value of Resources', topic_type: 'topic' }, { title: 'Classification: Natural, Human-made, and Human Resources', topic_type: 'topic' }, { title: 'Resource Conservation and Principles of Sustainable Development', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'Land, Soil, Water, Natural Vegetation and Wildlife Resources', topics: [{ title: 'Land Resources, Land Use Patterns, and Conservation', topic_type: 'topic' }, { title: 'Soil Profile, Weathering, and Soil Erosion Prevention', topic_type: 'topic' }, { title: 'Water Scarcity, Conservation, and Rainwater Harvesting', topic_type: 'topic' }, { title: 'Distribution and Conservation of Natural Vegetation and Wildlife', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'Agriculture', topics: [{ title: 'Farming Systems: Subsistence and Commercial Agriculture', topic_type: 'topic' }, { title: 'Major Food and Cash Crops', topic_type: 'topic' }, { title: 'Agricultural Development and Comparative Farm Case Studies', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'Industries', topics: [{ title: 'Classification of Industries by Raw Material, Size, Ownership', topic_type: 'topic' }, { title: 'Factors Affecting Industrial Location and Industrial Regions', topic_type: 'topic' }, { title: 'Major World Industries: Iron/Steel and Information Technology', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'Human Resources', topics: [{ title: 'Distribution and Density of Population', topic_type: 'topic' }, { title: 'Factors Influencing Population Distribution', topic_type: 'topic' }, { title: 'Population Change, Composition, and Population Pyramids', topic_type: 'topic' }] },

      // Civics / Political Science (Social and Political Life-III)
      { chapter_number: 14, chapter_name: 'The Indian Constitution', topics: [{ title: 'Why Does a Country Need a Constitution?', topic_type: 'topic' }, { title: 'Key Features: Federalism, Parliamentary Form, Separation of Powers', topic_type: 'topic' }, { title: 'Fundamental Rights and Secularism', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'Understanding Secularism', topics: [{ title: 'Definition of Secularism and Separation of Religion and State', topic_type: 'topic' }, { title: 'Indian Secularism vs. Other Democratic Nations', topic_type: 'topic' }] },
      { chapter_number: 16, chapter_name: 'Parliament and the Making of Laws', topics: [{ title: 'Why Should People Decide? Role of Citizens in Democracy', topic_type: 'topic' }, { title: 'Functions of Parliament: Select Government, Control, Unfold Laws', topic_type: 'topic' }, { title: 'How Do New Laws Come About? Case Study of Unpopular Laws', topic_type: 'topic' }] },
      { chapter_number: 17, chapter_name: 'Judiciary', topics: [{ title: 'Role and Independence of the Judiciary', topic_type: 'topic' }, { title: 'Structure of Courts in India: Integrated Judicial System', topic_type: 'topic' }, { title: 'Branches of Legal System: Civil Law vs. Criminal Law', topic_type: 'topic' }, { title: 'Public Interest Litigation (PIL) and Access to Courts', topic_type: 'topic' }] },
      { chapter_number: 18, chapter_name: 'Understanding Marginalisation', topics: [{ title: 'What is Marginalisation? Adivasis and Development', topic_type: 'topic' }, { title: 'Minorities and Marginalisation: Case Study of Muslims', topic_type: 'topic' }] },
      { chapter_number: 19, chapter_name: 'Confronting Marginalisation', topics: [{ title: 'Invoking Fundamental Rights to Fight Inequality', topic_type: 'topic' }, { title: 'Laws for Marginalised Groups and SC/ST Prevention of Atrocities Act', topic_type: 'topic' }, { title: 'Reservations as Social Justice Policy', topic_type: 'topic' }] },
      { chapter_number: 20, chapter_name: 'Public Facilities', topics: [{ title: 'Water as Part of Fundamental Right to Life', topic_type: 'topic' }, { title: 'Government Role in Providing Public Facilities', topic_type: 'topic' }, { title: 'Water Availability and Inequities Across Cities', topic_type: 'topic' }] },
      { chapter_number: 21, chapter_name: 'Law and Social Justice', topics: [{ title: 'Minimising Market Exploitation: Minimum Wages Act', topic_type: 'topic' }, { title: 'Enforcement of Safety Laws and Bhopal Gas Tragedy Case', topic_type: 'topic' }, { title: 'New Environmental Protection Laws and Worker Rights', topic_type: 'topic' }] }
    ]
  },
  {
    student_class: '8',
    subject: 'English',
    chapters: [
      { chapter_number: 1, chapter_name: 'The Best Christmas Present in the World & Poem: The Ant and the Cricket', topics: [{ title: 'Syllabus Grammar: Tenses & Active-Passive Voice', topic_type: 'grammar' }] },
      { chapter_number: 2, chapter_name: 'The Tsunami & Poem: Geography Lesson', topics: [{ title: 'Syllabus Grammar: Direct and Indirect Speech', topic_type: 'grammar' }] },
      { chapter_number: 3, chapter_name: 'Glimpses of the Past & Poem: Macavity: The Mystery Cat', topics: [{ title: 'Syllabus Grammar: Prepositions and Conjunctions', topic_type: 'grammar' }] },
      { chapter_number: 4, chapter_name: 'Bepin Choudhury\'s Lapse of Memory & Poem: The Last Bargain', topics: [{ title: 'Syllabus Grammar: Modals and Conditionals', topic_type: 'grammar' }] },
      { chapter_number: 5, chapter_name: 'The Summit Within & Poem: The School Boy', topics: [{ title: 'Syllabus Grammar: Subject-Verb Agreement', topic_type: 'grammar' }] },
      { chapter_number: 6, chapter_name: 'This is Jody\'s Fawn', topics: [{ title: 'Syllabus Grammar: Determiners and Noun Clauses', topic_type: 'grammar' }] },
      { chapter_number: 7, chapter_name: 'A Visit to Cambridge & Poem: When I Set Out for Lyonnesse', topics: [{ title: 'Syllabus Grammar: Relative Clauses', topic_type: 'grammar' }] },
      { chapter_number: 8, chapter_name: 'A Short Monsoon Diary & Poem: On the Grasshopper and Cricket', topics: [{ title: 'Syllabus Grammar: Participles and Infinitives', topic_type: 'grammar' }] },
      { chapter_number: 9, chapter_name: 'How the Camel Got His Hump (It So Happened)', topics: [{ title: 'Reading Comprehension & Vocabulary Skills', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'Children at Work (It So Happened)', topics: [{ title: 'Reading Comprehension & Character Sketch', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'The Selfish Giant (It So Happened)', topics: [{ title: 'Reading Comprehension & Theme Analysis', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'The Treasure Within (It So Happened)', topics: [{ title: 'Reading Comprehension & Direct Text Analysis', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'Princess September (It So Happened)', topics: [{ title: 'Reading Comprehension & Moral Insights', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'The Fight (It So Happened)', topics: [{ title: 'Reading Comprehension & Vocabulary Building', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'Jalebis (It So Happened)', topics: [{ title: 'Reading Comprehension & Narrative Structure', topic_type: 'topic' }] },
      { chapter_number: 16, chapter_name: 'Ancient Education System of India (It So Happened)', topics: [{ title: 'Reading Comprehension & Informational Prose Analysis', topic_type: 'topic' }] }
    ]
  },
  {
    student_class: '8',
    subject: 'Hindi',
    chapters: [
      { chapter_number: 1, chapter_name: 'लाख की चूड़ियाँ (कामतानाथ)', topics: [{ title: 'पाठ्य-विवरण एवं भावार्थ', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'बस की यात्रा (हरिशंकर परसाई)', topics: [{ title: 'व्यंग्य बोध एवं भाषा शैली', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'दीवानों की हस्ती (भगवतीचरण वर्मा)', topics: [{ title: 'कविता भावार्थ एवं काव्य सौंदर्य', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'भगवान के डाकिए (रामधारी सिंह \'दिनकर\')', topics: [{ title: 'कविता वाचन एवं विचार अभिव्यक्ति', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'क्या निराश हुआ जाए (हजारीप्रसाद द्विवेदी)', topics: [{ title: 'निबंध विचार बोध एवं जीवन मूल्य', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'यह सबसे कठिन समय नहीं (जया जादवानी)', topics: [{ title: 'कविता भावार्थ एवं आशावादी दृष्टिकोण', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'कबीर की साखियाँ (कबीरदास)', topics: [{ title: 'साखी भावार्थ एवं दोहा व्याख्या', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'सुदामा चरित (नरोत्तमदास)', topics: [{ title: 'काव्य पाठ एवं मित्रता का भाव', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'जहाँ पहिया है (पी. साईनाथ)', topics: [{ title: 'रिपोर्टाज अध्ययन एवं महिला सशक्तिकरण', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'अकबरी लोटा (अन्नपूर्णानन्द वर्मा)', topics: [{ title: 'हास्य-व्यंग्य कहानी पाठ', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'सूरदास के पद (सूरदास)', topics: [{ title: 'पद व्याख्या एवं वात्सल्य भाव', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'पानी की कहानी (रामचन्द्र तिवारी)', topics: [{ title: 'वैज्ञानिक निबंध एवं जल चक्र ज्ञान', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'बाज और साँप (निर्मल वर्मा)', topics: [{ title: 'प्रतीकात्मक कहानी एवं स्वतंत्रता बोध', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'व्याकरण: भाषा, बोली, लिपि और व्याकरण', topics: [{ title: 'भाषा एवं वर्ण विचार', topic_type: 'grammar' }] },
      { chapter_number: 15, chapter_name: 'व्याकरण: शब्द विचार, समास, एवं संधि', topics: [{ title: 'शब्द भेद, तत्पुरुष/द्वंद्व समास, स्वर संधि', topic_type: 'grammar' }] },
      { chapter_number: 16, chapter_name: 'व्याकरण: संज्ञा, सर्वनाम, विशेषण, क्रिया', topics: [{ title: 'पद परिचय एवं प्रयोग नियम', topic_type: 'grammar' }] },
      { chapter_number: 17, chapter_name: 'व्याकरण: अशुद्धि संशोधन एवं मुहावरे', topics: [{ title: 'वाक्य शुद्धि एवं मुहावरे/लोकोक्तियाँ', topic_type: 'grammar' }] }
    ]
  },
  {
    student_class: '8',
    subject: 'Sanskrit',
    chapters: [
      { chapter_number: 1, chapter_name: 'सुभाषितानि', topics: [{ title: 'श्लोक वाचन एवं अन्वय', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'बिलस्य वाणी न कदापि मे श्रुता', topics: [{ title: 'पंचतंत्र कथा एवं नीति ज्ञान', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'डीजीभारतम्', topics: [{ title: 'डिजिटल इण्डिया निबन्ध बोध', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'सदैव पुरतो निधेहि चरणम्', topics: [{ title: 'गीत वाचन एवं उत्साहवर्धन', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'कण्टकेनैव कण्टकम्', topics: [{ title: 'लोककथा एवं व्यवहार ज्ञान', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'गृहं शून्यं सुतां बिना', topics: [{ title: 'कन्या संरक्षण एवं सामाजिक चेतना', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'भारतजनताऽहम्', topics: [{ title: 'कविता भावार्थ एवं गौरव बोध', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'संसारसागरस्य नायकाः', topics: [{ title: 'परम्परागत शिल्प ज्ञान एवं जल संरक्षण', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'सप्तभगिन्यः', topics: [{ title: 'पूर्वोत्तर राज्य परिचय', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'नीतिनवनीतम्', topics: [{ title: 'मनुस्मृति श्लोक एवं सदाचार ज्ञान', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'सावित्री बाई फुले', topics: [{ title: 'स्त्री शिक्षा एवं समाज सुधार', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'कः रक्षति कः रक्षितः', topics: [{ title: 'पर्यावरण संरक्षण एवं स्वच्छता', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'क्षितौ राजते भारतस्वर्णभूमिः', topics: [{ title: 'भारत महिमा गीत पाठ', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'आर्यभटः', topics: [{ title: 'प्राचीन भारतीय वैज्ञानिक आर्यभट योगदान', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'संस्कृत व्याकरणम्', topics: [{ title: 'संधि (स्वर व व्यञ्जन), शब्दरूप, धातुरूप (पञ्चलकार)', topic_type: 'grammar' }] }
    ]
  },

  // ==========================================
  // CLASS 9
  // ==========================================
  {
    student_class: '9',
    subject: 'Mathematics',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Orienting Yourself: The Use of Coordinates',
        topics: [
          { title: 'Exercise 1.1', description: 'Covers locating points on a rectangular spatial grid and defining positions using ordered coordinate pairs.', topic_type: 'exercise' },
          { title: 'Exercise 1.2', description: 'Covers the Cartesian coordinate system, coordinate axes, origin, four quadrants, and plotting (x, y) coordinate points.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers geometric figures on the coordinate plane, reflection across axes, and coordinate geometry word problems.', topic_type: 'exercise' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Introduction to Linear Polynomials',
        topics: [
          { title: 'Exercise 2.1', description: 'Covers identifying terms, variables, coefficients, and degree in linear polynomial expressions.', topic_type: 'exercise' },
          { title: 'Exercise 2.2', description: 'Covers finding zeroes of linear polynomials and interpreting their geometric meaning on the Cartesian line.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers algebraic modeling of constant rate of change and real-life linear growth phenomena.', topic_type: 'exercise' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'The World of Numbers',
        topics: [
          { title: 'Exercise 3.1', description: 'Covers real numbers, rational numbers, decimal expansions (terminating and repeating), and the density property.', topic_type: 'exercise' },
          { title: 'Exercise 3.2', description: 'Covers irrational numbers and geometric construction of square root magnitudes on the number line using the square root spiral.', topic_type: 'exercise' },
          { title: 'Exercise 3.3', description: 'Covers operations on real numbers, rationalizing denominators, and applying laws of rational exponents.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers analytical proofs of irrationality for square roots (√2, √3) and complex real-number evaluations.', topic_type: 'exercise' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Exploring Algebraic Identities',
        topics: [
          { title: 'Exercise 4.1', description: 'Covers geometric visual models and algebraic expansions of identities (a ± b)² and difference of squares a² - b².', topic_type: 'exercise' },
          { title: 'Exercise 4.2', description: 'Covers algebraic derivation, expansions, and computational applications of cubic identities (a ± b)³ and a³ ± b³.', topic_type: 'exercise' },
          { title: 'Exercise 4.3', description: 'Covers expansions of the trinomial identity (a + b + c)² and conditional cubic identities.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers factorisation of multi-variable polynomials using algebraic identities.', topic_type: 'exercise' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'I\'m Up and Down, and Round and Round (Circles)',
        topics: [
          { title: 'Exercise 5.1', description: 'Covers geometric definitions and terminology of circles: radius, diameter, chords, arcs, sectors, and segments.', topic_type: 'exercise' },
          { title: 'Exercise 5.2', description: 'Covers theorems establishing that equal chords subtend equal angles at the center and are equidistant from the center.', topic_type: 'exercise' },
          { title: 'Exercise 5.3', description: 'Covers angle subtended by an arc at the center versus remaining circumference, angles in a semicircle, and cyclic quadrilaterals.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers deductive geometric proofs and riders on circle properties.', topic_type: 'exercise' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'Measuring Space: Perimeter and Area',
        topics: [
          { title: 'Exercise 6.1', description: 'Covers conceptual foundation of perimeter and area calculations for regular and composite polygons.', topic_type: 'exercise' },
          { title: 'Exercise 6.2', description: 'Covers application of Heron’s formula (√s(s-a)(s-b)(s-c)) to find the area of scalene and isosceles triangles.', topic_type: 'exercise' },
          { title: 'Exercise 6.3', description: 'Covers Brahmagupta’s formula for finding areas of cyclic quadrilaterals and practical land measurement problems.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers area estimation, composite geometric layouts, and optimization problems.', topic_type: 'exercise' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'The Mathematics of Maybe: Introduction to Probability',
        topics: [
          { title: 'Exercise 7.1', description: 'Covers random experiments, outcomes, trial events, and sample space formulation.', topic_type: 'exercise' },
          { title: 'Exercise 7.2', description: 'Covers empirical (experimental) probability versus theoretical probability for simple chance events.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers multi-stage probability situations, tree diagram modeling, and risk evaluation problems.', topic_type: 'exercise' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Predicting What Comes Next: Exploring Sequences and Progressions',
        topics: [
          { title: 'Exercise 8.1', description: 'Covers recognizing numerical and geometric patterns, inductive thinking, and calculating differences between terms.', topic_type: 'exercise' },
          { title: 'Exercise 8.2', description: 'Covers formulating the general term of arithmetic progressions and identifying arithmetic sequences.', topic_type: 'exercise' },
          { title: 'End of Chapter Exercises', description: 'Covers sequence modeling, recurrence relations, and mathematical problem-solving.', topic_type: 'exercise' }
        ]
      },
      // CRITICAL REQUIREMENT: Chapters 9-15 must exist, but MUST NOT contain fabricated exercise nodes
      { chapter_number: 9, chapter_name: 'Linear Equations in Two Variables', topics: [] },
      { chapter_number: 10, chapter_name: 'Introduction to Euclid\'s Geometry', topics: [] },
      { chapter_number: 11, chapter_name: 'Lines and Angles', topics: [] },
      { chapter_number: 12, chapter_name: 'Triangles — Congruence Theorems', topics: [] },
      { chapter_number: 13, chapter_name: '4-gons (Quadrilaterals)', topics: [] },
      { chapter_number: 14, chapter_name: 'Surface Area and Volume', topics: [] },
      { chapter_number: 15, chapter_name: 'Statistics', topics: [] }
    ]
  },
  {
    student_class: '9',
    subject: 'Science',
    chapters: [
      {
        chapter_number: 1,
        chapter_name: 'Exploration: Entering the World of Secondary Science',
        topics: [
          { title: 'Nature of Scientific Inquiry, Observation, and Empiricism', topic_type: 'topic' },
          { title: 'Formulating Hypotheses and Scientific Modeling', topic_type: 'topic' },
          { title: 'Measurement, International System of Units (SI), and Metric Conversions', topic_type: 'topic' },
          { title: 'Laboratory Safety Standards, Apparatus Handling, and Error Analysis', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 2,
        chapter_name: 'Cell: The Building Block of Life',
        topics: [
          { title: 'Discovery of the Cell, Cell Theory, and Microscopy', topic_type: 'topic' },
          { title: 'Plasma Membrane: Diffusion, Osmosis, and Tonicity (Hypotonic, Isotonic, Hypertonic)', topic_type: 'topic' },
          { title: 'Cell Wall Structure and Plasmolysis', topic_type: 'topic' },
          { title: 'Nucleus, Chromatin Material, Chromosomes, and DNA', topic_type: 'topic' },
          { title: 'Cytoplasm and Membrane-Bound Organelles (Endoplasmic Reticulum, Golgi Apparatus, Lysosomes, Mitochondria, Plastids, Vacuoles)', topic_type: 'topic' },
          { title: 'Prokaryotic vs. Eukaryotic Structural Comparison', topic_type: 'topic' },
          { title: 'Cell Division: Mitosis (Growth and Repair) vs. Meiosis (Gamete Formation)', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 3,
        chapter_name: 'Tissues in Action',
        topics: [
          { title: 'Plant Tissues: Meristematic (Apical, Lateral, Intercalary) vs. Permanent Tissues', topic_type: 'topic' },
          { title: 'Simple Permanent Tissues: Parenchyma, Collenchyma, Sclerenchyma', topic_type: 'topic' },
          { title: 'Complex Permanent Tissues: Xylem Components and Phloem Components', topic_type: 'topic' },
          { title: 'Protective Tissues: Epidermis, Stomata, and Cork (Suberin Formation)', topic_type: 'topic' },
          { title: 'Animal Tissues: Epithelial, Connective (Blood, Bone, Cartilage, Areolar, Adipose), Muscular (Striated, Unstriated, Cardiac), Nervous Tissue (Neuron Structure)', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 4,
        chapter_name: 'Describing Motion Around Us',
        topics: [
          { title: 'Concept of Rest and Motion in Reference Frames', topic_type: 'topic' },
          { title: 'Scalar vs. Vector Quantities: Distance vs. Displacement', topic_type: 'topic' },
          { title: 'Speed, Velocity, and Acceleration', topic_type: 'topic' },
          { title: 'Uniform vs. Non-Uniform Motion', topic_type: 'topic' },
          { title: 'Graphical Analysis: Distance-Time Graphs and Velocity-Time Graphs', topic_type: 'topic' },
          { title: 'Kinematic Equations of Motion Derivation (v = u + at, s = ut + ½at², v² - u² = 2as)', topic_type: 'topic' },
          { title: 'Uniform Circular Motion and Centripetal Acceleration', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 5,
        chapter_name: 'Exploring Mixtures and their Separation',
        topics: [
          { title: 'Pure Substances (Elements and Compounds) vs. Mixtures', topic_type: 'topic' },
          { title: 'Homogeneous vs. Heterogeneous Mixtures', topic_type: 'topic' },
          { title: 'True Solutions: Solute, Solvent, Concentration, Saturated/Unsaturated, Solubility', topic_type: 'topic' },
          { title: 'Suspensions and Colloidal Solutions (Tyndall Effect, Brownian Motion)', topic_type: 'topic' },
          { title: 'Separation Techniques: Evaporation, Centrifugation, Separating Funnel, Sublimation, Chromatography, Simple and Fractional Distillation, Crystallisation', topic_type: 'topic' },
          { title: 'Physical vs. Chemical Changes', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 6,
        chapter_name: 'How Forces Affect Motion',
        topics: [
          { title: 'Balanced vs. Unbalanced Forces', topic_type: 'topic' },
          { title: 'Newton’s First Law of Motion and Inertia (Mass as a Measure of Inertia)', topic_type: 'topic' },
          { title: 'Linear Momentum (p = mv) and Newton’s Second Law of Motion (F = ma)', topic_type: 'topic' },
          { title: 'Impulse and Applications of Second Law', topic_type: 'topic' },
          { title: 'Newton’s Third Law of Motion (Action and Reaction)', topic_type: 'topic' },
          { title: 'Law of Conservation of Linear Momentum and Recoil of Gun', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 7,
        chapter_name: 'Work, Energy and Simple Machines',
        topics: [
          { title: 'Scientific Work: Definition, Conditions, Positive/Negative/Zero Work', topic_type: 'topic' },
          { title: 'Energy Forms and Kinetic Energy Derivation (E_k = ½mv²)', topic_type: 'topic' },
          { title: 'Gravitational Potential Energy Derivation (E_p = mgh)', topic_type: 'topic' },
          { title: 'Law of Conservation of Mechanical Energy for Free-Falling Objects', topic_type: 'topic' },
          { title: 'Power: Rate of Doing Work (Watt) and Commercial Unit (kWh)', topic_type: 'topic' },
          { title: 'Mechanical Advantage and Efficiency in Simple Machines (Levers, Pulleys, Inclined Planes)', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 8,
        chapter_name: 'Journey Inside the Atom',
        topics: [
          { title: 'Historical Atomic Models: Dalton’s Postulates and Limitations', topic_type: 'topic' },
          { title: 'Thomson’s Cathode Ray Experiment and Plum Pudding Model', topic_type: 'topic' },
          { title: 'Rutherford’s Alpha-Particle Scattering Experiment and Nuclear Model', topic_type: 'topic' },
          { title: 'Bohr’s Model of the Atom (Discrete Energy Orbits and Shells K, L, M, N)', topic_type: 'topic' },
          { title: 'Discovery of Neutrons (Chadwick)', topic_type: 'topic' },
          { title: 'Atomic Number (Z) and Mass Number (A)', topic_type: 'topic' },
          { title: 'Electronic Configuration and Valency Calculation', topic_type: 'topic' },
          { title: 'Isotopes (Protium/Deuterium/Tritium, C-12/C-14) and Isobars', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 9,
        chapter_name: 'Atomic Foundations of Matter',
        topics: [
          { title: 'Laws of Chemical Combination: Law of Conservation of Mass and Law of Constant Proportions', topic_type: 'topic' },
          { title: 'Atomic Symbolism, Unified Atomic Mass Unit (u), and Relative Atomic Mass', topic_type: 'topic' },
          { title: 'Molecules of Elements vs. Molecules of Compounds', topic_type: 'topic' },
          { title: 'Ions: Cations, Anions, and Polyatomic Ions', topic_type: 'topic' },
          { title: 'Writing Chemical Formulas via Criss-Cross Valency Method', topic_type: 'topic' },
          { title: 'Molecular Mass and Formula Unit Mass Calculations', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 10,
        chapter_name: 'Sound Waves: Characteristics and Applications',
        topics: [
          { title: 'Nature of Sound: Mechanical Longitudinal Waves', topic_type: 'topic' },
          { title: 'Compressions and Rarefactions in Elastic Media', topic_type: 'topic' },
          { title: 'Wave Characteristics: Wavelength (λ), Amplitude (A), Frequency (ν), Time Period (T), and Speed (v = νλ)', topic_type: 'topic' },
          { title: 'Factors Affecting Speed of Sound in Solids, Liquids, and Gases', topic_type: 'topic' },
          { title: 'Reflection of Sound, Echoes, and Reverberation Control', topic_type: 'topic' },
          { title: 'Audible Spectrum: Infrasound (<20 Hz) vs. Ultrasound (>20 kHz)', topic_type: 'topic' },
          { title: 'Industrial and Medical Applications of Ultrasound (Echocardiography, Ultrasonography, Flaw Detection)', topic_type: 'topic' },
          { title: 'SONAR Mechanics and Depth Measurement Calculations', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 11,
        chapter_name: 'Reproduction: How Life Continues',
        topics: [
          { title: 'Asexual Reproduction Mechanisms: Fission, Fragmentation, Regeneration, Budding, Spore Formation, Vegetative Propagation', topic_type: 'topic' },
          { title: 'Sexual Reproduction in Flowering Plants: Flower Anatomy, Pollination (Self/Cross), Fertilisation, Seed Formation', topic_type: 'topic' },
          { title: 'Human Reproductive Systems: Male and Female Anatomy and Gametogenesis', topic_type: 'topic' },
          { title: 'Menstrual Cycle Physiology and Embryonic Implantation', topic_type: 'topic' },
          { title: 'Reproductive Health, Contraceptive Methods (Barrier, Chemical, IUCD, Surgical), and Sexually Transmitted Diseases (STDs)', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 12,
        chapter_name: 'Patterns in Life: Diversity and Classification',
        topics: [
          { title: 'Taxonomic Hierarchy (Domain, Kingdom, Phylum, Class, Order, Family, Genus, Species)', topic_type: 'topic' },
          { title: 'Five-Kingdom Classification System (Whittaker): Monera, Protista, Fungi, Plantae, Animalia', topic_type: 'topic' },
          { title: 'Plant Kingdom Division: Thallophyta, Bryophyta, Pteridophyta, Gymnosperms, Angiosperms', topic_type: 'topic' },
          { title: 'Animal Kingdom Phyla: Porifera, Cnidaria, Platyhelminthes, Nematoda, Annelida, Arthropoda, Mollusca, Echinodermata, Chordata (Protochordata, Vertebrata)', topic_type: 'topic' },
          { title: 'Vertebrate Classes: Pisces, Amphibia, Reptilia, Aves, Mammalia', topic_type: 'topic' },
          { title: 'Binomial Nomenclature Rules (Linnaeus)', topic_type: 'topic' }
        ]
      },
      {
        chapter_number: 13,
        chapter_name: 'Earth as a System: Energy, Matter and Life',
        topics: [
          { title: 'Biosphere Components: Atmosphere, Hydrosphere, Lithosphere', topic_type: 'topic' },
          { title: 'Role of Atmosphere in Climate Control and Winds Mechanics', topic_type: 'topic' },
          { title: 'Water Cycle, Rain Formation, and Ground-Water Table', topic_type: 'topic' },
          { title: 'Biogeochemical Cycles: Water Cycle, Carbon Cycle, Oxygen Cycle, Nitrogen Cycle', topic_type: 'topic' },
          { title: 'Greenhouse Effect, Global Warming, and Ozone Layer Depletion (CFCs)', topic_type: 'topic' },
          { title: 'Air, Water, and Soil Pollution: Causes, Prevention, and Remediation', topic_type: 'topic' }
        ]
      }
    ]
  },
  {
    student_class: '9',
    subject: 'Social Science',
    chapters: [
      { chapter_number: 1, chapter_name: 'Social Science: Meaning, Scope, and Importance', topics: [{ title: 'Overview of Social Science disciplines and societal impact', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'Landforms: Earth\'s Living Canvas', topics: [{ title: 'Plate tectonics, mountain building, plains, and plateaus', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'The Dynamic Atmosphere and Changing Climate', topics: [{ title: 'Atmospheric layers, weather, climate drivers, and global change', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'The Earliest People: The Stone Age', topics: [{ title: 'Paleolithic, Mesolithic, and Neolithic life and tools', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'Harappan and Mesopotamian Civilisation', topics: [{ title: 'Town planning, trade, economy, and culture of Indus and Mesopotamia', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'Egyptian and Chinese Civilisations', topics: [{ title: 'Nile Valley, Dynastic China, writing systems, and governance', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'Vedic Age', topics: [{ title: 'Early and Later Vedic society, literature, polity, and economy', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'Rise of Kingdoms, Republics & Early Empires', topics: [{ title: 'Mahajanapadas, Mauryan Empire, Ashoka, and administration', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'Understanding Democracy', topics: [{ title: 'Principles, values, historical evolution, and democratic institutions', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'Elections in a Democracy', topics: [{ title: 'Electoral process, Election Commission, voting rights, and political parties', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'Why Choices Matter: The Basics of Economics', topics: [{ title: 'Scarcity, opportunity cost, factors of production, and basic economic questions', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'Why Prices Change: Demand & Supply', topics: [{ title: 'Market forces, demand/supply curves, and equilibrium pricing', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'Water in the Oceans', topics: [{ title: 'Ocean relief, salinity, waves, tides, and ocean currents', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'Disaster Preparedness & Regulatory Frameworks', topics: [{ title: 'Natural/man-made disasters, safety protocols, and NDMA guidelines', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'Forests, Biodiversity & Livelihoods', topics: [{ title: 'Forest types, ecosystem services, community conservation, and policy', topic_type: 'topic' }] },
      { chapter_number: 16, chapter_name: 'Early and Later Medieval India', topics: [{ title: 'Regional kingdoms, Delhi Sultanate, Mughal Empire, and cultural synthesis', topic_type: 'topic' }] },
      { chapter_number: 17, chapter_name: 'Ancient and Medieval Global Connections', topics: [{ title: 'Silk Route, maritime trade, and cultural exchanges across Asia and Europe', topic_type: 'topic' }] },
      { chapter_number: 18, chapter_name: 'The Idea of Authority and Governance', topics: [{ title: 'Statecraft, monarchy, feudalism, and constitutional development', topic_type: 'topic' }] },
      { chapter_number: 19, chapter_name: 'Entrepreneurship and Startups', topics: [{ title: 'Innovation, business models, startup ecosystem, and economic growth', topic_type: 'topic' }] },
      { chapter_number: 20, chapter_name: 'Financial Planning, Investment & Taxation', topics: [{ title: 'Savings, banking, stock market basics, direct/indirect taxes, and budgeting', topic_type: 'topic' }] }
    ]
  },
  {
    student_class: '9',
    subject: 'English',
    chapters: [
      { chapter_number: 1, chapter_name: 'In the Realm of Morning (Prose)', topics: [{ title: 'Reading Comprehension, Narrative Structure, and Character Analysis', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'The Wind and the Leaves (Poem)', topics: [{ title: 'Poetic Devices, Imagery, Stanzaic Structure, and Theme Analysis', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'The Silver Lining (Prose)', topics: [{ title: 'Prose Comprehension, Empathy Themes, and Character Sketch', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'Symphony of the Hills (Prose)', topics: [{ title: 'Descriptive Prose, Nature Symbolism, and Vocabulary Expansion', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'Song of the Open Road (Poem)', topics: [{ title: 'Poetic Analysis, Rhythm, Tone, and Free-Spirited Themes', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'Shadows of the Banyan Tree (Prose)', topics: [{ title: 'Prose Analysis, Cultural Context, and Plot Dynamics', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'The Unbroken Wave (Prose & Reflection)', topics: [{ title: 'Reflective Essay Analysis, Environmental Insights, and Reading Comprehension', topic_type: 'topic' }] },
      {
        chapter_number: 8,
        chapter_name: 'English Grammar Syllabus',
        topics: [
          { title: 'Tenses (Present, Past, and Future Forms; Simple, Continuous, Perfect)', topic_type: 'grammar' },
          { title: 'Modals (can, could, may, might, shall, should, will, would, must, ought to)', topic_type: 'grammar' },
          { title: 'Subject-Verb Concord (Rules of Number and Person Agreement)', topic_type: 'grammar' },
          { title: 'Reported Speech: Commands and Requests', topic_type: 'grammar' },
          { title: 'Reported Speech: Statements / Assertive Sentences', topic_type: 'grammar' },
          { title: 'Reported Speech: Questions (Wh- Questions and Yes/No Questions)', topic_type: 'grammar' },
          { title: 'Determiners (Articles, Demonstratives, Possessives, Quantifiers)', topic_type: 'grammar' },
          { title: 'Clauses (Noun Clauses, Adverb Clauses of Condition and Time, Relative Clauses)', topic_type: 'grammar' }
        ]
      }
    ]
  },
  {
    student_class: '9',
    subject: 'Hindi',
    chapters: [
      { chapter_number: 1, chapter_name: 'नया प्रभात (कविता)', topics: [{ title: 'कविता वाचन, भावार्थ एवं सौंदर्य बोध', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'मिट्टी की सौगंध (कहानी)', topics: [{ title: 'कहानी पाठ, पात्र चित्रण एवं नैतिक मूल्य', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'संस्कृति के स्वर (निबंध)', topics: [{ title: 'निबंध वाचन, सांस्कृतिक विचार बोध एवं निबंध शैली', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'समय की शिला पर (कविता)', topics: [{ title: 'काव्य पाठ, समय का महत्त्व एवं काव्य सौंदर्य', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'सच्चा मित्र (कहानी)', topics: [{ title: 'कहानी विश्लेषण, मित्रता का भाव एवं संवाद', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'भारत के दीप (प्रेरक प्रसंग)', topics: [{ title: 'प्रेरक संस्मरण पाठ एवं महापुरुष जीवनी', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'प्रकृति का संदेश (संस्मरण)', topics: [{ title: 'प्रकृति चेतना, संस्मरण बोध एवं पर्यावरण संवेदनशीलता', topic_type: 'topic' }] },
      {
        chapter_number: 8,
        chapter_name: 'हिंदी व्याकरण (गंगा पाठ्यपुस्तक)',
        topics: [
          { title: 'शब्द निर्माण: उपसर्ग एवं प्रत्यय', topic_type: 'grammar' },
          { title: 'समास: तत्पुरुष, कर्मधारय, बहुव्रीहि, द्वंद्व, द्विगु, अव्ययीभाव समास', topic_type: 'grammar' },
          { title: 'अर्थ की दृष्टि से वाक्य भेद (विधानवाचक, निषेधवाचक, आज्ञावाचक, प्रश्नवाचक, विस्मयादिवाचक, संदेहवाचक, इच्छावाचक, संकेतवाचक)', topic_type: 'grammar' },
          { title: 'अलंकार (शब्दालंकार: अनुप्रास, यमक; अर्थालंकार: उपमा, रूपक, उत्प्रेक्षा, अतिशयोक्ति, मानवीकरण)', topic_type: 'grammar' }
        ]
      }
    ]
  },
  {
    student_class: '9',
    subject: 'Sanskrit',
    chapters: [
      { chapter_number: 1, chapter_name: 'मङ्गलाचरणम् एवं वन्दना', topics: [{ title: 'श्लोक पाठ, अन्वय एवं मङ्गल भावना', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'विद्यायाः महत्त्वम्', topics: [{ title: 'विद्या प्रशंसा, नीति श्लोक एवं सुभाषित ज्ञान', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'पर्यावरण-संरक्षणम्', topics: [{ title: 'पर्यावरण चेतना, पाठ बोध एवं प्रकृति रक्षा', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'सदाचारस्य शक्तिः', topics: [{ title: 'सदाचार महिमा, नैतिक शिक्षा एवं व्यवहार ज्ञान', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'भारतस्य गौरवम्', topics: [{ title: 'भारत महिमा, देशगौरव एवं राष्ट्रभक्ति', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'वैज्ञानिकदृष्टिकोणः', topics: [{ title: 'वैज्ञानिक चेतना, आधुनिक दृष्टि एवं ज्ञान वर्धन', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'सूक्ति-सुधा', topics: [{ title: 'सूक्ति पठन, सुभाषित वाचन एवं अन्वय बोध', topic_type: 'topic' }] },
      {
        chapter_number: 8,
        chapter_name: 'संस्कृत व्याकरणम् (शारदा पाठ्यपुस्तक)',
        topics: [
          { title: 'स्वरसन्धि (दीर्घ, गुण, वृद्धि, यण्, अयादि) एवं व्यञ्जनसन्धि (वर्ग-प्रथम-वर्णस्य तृतीय-वर्ण परिवर्तनम्, अनुस्वार-सन्धिः)', topic_type: 'grammar' },
          { title: 'शब्दरूपाणि: पुंलिङ्ग, स्त्रीलिङ्ग, नपुंसकलिङ्ग शब्दाः (अकारान्त, आकारान्त, इकारान्त, ईकारान्त, उकारान्त)', topic_type: 'grammar' },
          { title: 'सर्वनामशब्दाः: तत्, एतत्, किम्, अस्मद्, युष्मद्', topic_type: 'grammar' },
          { title: 'धातुरूपाणि: पञ्चसु लकारेषु (लट्, लृट्, लङ्, लोट्, विधिलिङ्; परस्मैपदिनः एवं आत्मनेपदिनः धातवः)', topic_type: 'grammar' },
          { title: 'कारक-प्रकरणम् एवं उपपद-विभक्तयः (द्वितीया तः सप्तमी पर्यन्तम्)', topic_type: 'grammar' },
          { title: 'प्रत्ययाः: क्त्वा, ल्यप्, तुमुन्, क्त, क्तवतु', topic_type: 'grammar' },
          { title: 'अव्ययपदानि (अपि, च, एव, उच्चैः, अद्य, ह्यः, श्वः, इतस्ततः, सर्वत्र)', topic_type: 'grammar' },
          { title: 'सङ्ख्यावाचक-शब्दाः (१ तः ५० पर्यन्तम्)', topic_type: 'grammar' }
        ]
      }
    ]
  },

  // ==========================================
  // CLASS 10
  // ==========================================
  {
    student_class: '10',
    subject: 'Mathematics',
    chapters: [
      { chapter_number: 1, chapter_name: 'Real Numbers', topics: [{ title: 'Exercise 1.1', description: 'Covers Fundamental Theorem of Arithmetic, prime factorisation method for HCF and LCM.', topic_type: 'exercise' }, { title: 'Exercise 1.2', description: 'Covers analytical proofs of irrationality for √2, √3, √5, and linear combinations.', topic_type: 'exercise' }] },
      { chapter_number: 2, chapter_name: 'Polynomials', topics: [{ title: 'Exercise 2.1', description: 'Covers geometric representation of zeroes of polynomials from graph intersections.', topic_type: 'exercise' }, { title: 'Exercise 2.2', description: 'Covers relationship between zeroes and coefficients of quadratic polynomials.', topic_type: 'exercise' }] },
      { chapter_number: 3, chapter_name: 'Pair of Linear Equations in Two Variables', topics: [{ title: 'Exercise 3.1', description: 'Covers graphical method of solution, consistency, and inconsistency conditions.', topic_type: 'exercise' }, { title: 'Exercise 3.2', description: 'Covers algebraic methods: Substitution method and Elimination method for linear pairs.', topic_type: 'exercise' }] },
      { chapter_number: 4, chapter_name: 'Quadratic Equations', topics: [{ title: 'Exercise 4.1', description: 'Covers formulation and identification of quadratic equations in standard form ax² + bx + c = 0.', topic_type: 'exercise' }, { title: 'Exercise 4.2', description: 'Covers solving quadratic equations by factorisation and splitting the middle term.', topic_type: 'exercise' }, { title: 'Exercise 4.3', description: 'Covers Quadratic Formula and discriminant (D = b² - 4ac) analysis for nature of roots.', topic_type: 'exercise' }] },
      { chapter_number: 5, chapter_name: 'Arithmetic Progressions', topics: [{ title: 'Exercise 5.1', description: 'Covers identifying APs, first term a, and common difference d.', topic_type: 'exercise' }, { title: 'Exercise 5.2', description: 'Covers finding the nth term of an AP using a_n = a + (n - 1)d.', topic_type: 'exercise' }, { title: 'Exercise 5.3', description: 'Covers sum of first n terms of an AP using S_n = n/2 [2a + (n - 1)d].', topic_type: 'exercise' }] },
      { chapter_number: 6, chapter_name: 'Triangles', topics: [{ title: 'Exercise 6.1', description: 'Covers definition and conditions for similarity of geometric figures.', topic_type: 'exercise' }, { title: 'Exercise 6.2', description: 'Covers Basic Proportionality Theorem (Thales Theorem) and its converse.', topic_type: 'exercise' }, { title: 'Exercise 6.3', description: 'Covers similarity criteria for triangles: AAA, SAS, SSS and application proofs.', topic_type: 'exercise' }] },
      { chapter_number: 7, chapter_name: 'Coordinate Geometry', topics: [{ title: 'Exercise 7.1', description: 'Covers Distance Formula between two points (x1, y1) and (x2, y2).', topic_type: 'exercise' }, { title: 'Exercise 7.2', description: 'Covers Section Formula for internal division and midpoint formula.', topic_type: 'exercise' }] },
      { chapter_number: 8, chapter_name: 'Introduction to Trigonometry', topics: [{ title: 'Exercise 8.1', description: 'Covers trigonometric ratios of acute angles in a right-angled triangle.', topic_type: 'exercise' }, { title: 'Exercise 8.2', description: 'Covers evaluation of expressions with specific standard angles (0°, 30°, 45°, 60°, 90°).', topic_type: 'exercise' }, { title: 'Exercise 8.3', description: 'Covers trigonometric identity sin²θ + cos²θ = 1, 1 + tan²θ = sec²θ, 1 + cot²θ = cosec²θ proofs.', topic_type: 'exercise' }] },
      { chapter_number: 9, chapter_name: 'Some Applications of Trigonometry', topics: [{ title: 'Exercise 9.1', description: 'Covers height and distance problems involving angle of elevation and angle of depression.', topic_type: 'exercise' }] },
      { chapter_number: 10, chapter_name: 'Circles', topics: [{ title: 'Exercise 10.1', description: 'Covers tangent to a circle theorem (perpendicular to radius at point of contact).', topic_type: 'exercise' }, { title: 'Exercise 10.2', description: 'Covers theorem on lengths of tangents drawn from an external point to a circle.', topic_type: 'exercise' }] },
      { chapter_number: 11, chapter_name: 'Areas Related to Circles', topics: [{ title: 'Exercise 11.1', description: 'Covers area of sector, segment of a circle, arc length, and composite shapes.', topic_type: 'exercise' }] },
      { chapter_number: 12, chapter_name: 'Surface Areas and Volumes', topics: [{ title: 'Exercise 12.1', description: 'Covers total and curved surface area of combinations of 3D solids (cubes, cylinders, cones, spheres, hemispheres).', topic_type: 'exercise' }, { title: 'Exercise 12.2', description: 'Covers volume of combined 3D solids and real-world practical applications.', topic_type: 'exercise' }] },
      { chapter_number: 13, chapter_name: 'Statistics', topics: [{ title: 'Exercise 13.1', description: 'Covers calculation of Mean for grouped frequency distribution (Direct, Assumed Mean methods).', topic_type: 'exercise' }, { title: 'Exercise 13.2', description: 'Covers Mode calculation for grouped data using modal class formula.', topic_type: 'exercise' }, { title: 'Exercise 13.3', description: 'Covers Median calculation for grouped frequency tables and cumulative frequency.', topic_type: 'exercise' }] },
      { chapter_number: 14, chapter_name: 'Probability', topics: [{ title: 'Exercise 14.1', description: 'Covers classical theoretical probability P(E) = n(E)/n(S), complementary events, and dice/cards/coins experiments.', topic_type: 'exercise' }] }
    ]
  },
  {
    student_class: '10',
    subject: 'Science',
    chapters: [
      { chapter_number: 1, chapter_name: 'Chemical Reactions and Equations', topics: [{ title: 'Chemical Changes and Writing Balanced Equations', topic_type: 'topic' }, { title: 'Combination and Decomposition Reactions', topic_type: 'topic' }, { title: 'Displacement and Double Displacement Reactions', topic_type: 'topic' }, { title: 'Oxidation, Reduction (Redox Reactions), Corrosion and Rancidity', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'Acids, Bases and Salts', topics: [{ title: 'Chemical Properties of Acids and Bases with Indicators', topic_type: 'topic' }, { title: 'pH Scale and Importance in Everyday Life', topic_type: 'topic' }, { title: 'Salts Family, Preparation and Uses (Bleaching Powder, Baking Soda, Washing Soda, Plaster of Paris)', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'Metals and Non-Metals', topics: [{ title: 'Physical and Chemical Properties of Metals and Non-Metals', topic_type: 'topic' }, { title: 'Reactivity Series and Ionic Compounds Formation', topic_type: 'topic' }, { title: 'Occurrence, Extraction of Metals, Refining, and Corrosion Prevention', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'Carbon and Its Compounds', topics: [{ title: 'Covalent Bonding in Carbon and Versatile Nature (Catenation, Tetravalency)', topic_type: 'topic' }, { title: 'Homologous Series, Nomenclature, and Functional Groups', topic_type: 'topic' }, { title: 'Chemical Properties: Combustion, Oxidation, Addition, Substitution Reactions', topic_type: 'topic' }, { title: 'Ethanol, Ethanoic Acid Properties, and Soaps and Detergents Cleansing Action', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'Life Processes', topics: [{ title: 'Autotrophic and Heterotrophic Nutrition in Plants and Humans', topic_type: 'topic' }, { title: 'Respiration: Aerobic vs. Anaerobic and Human Respiratory System', topic_type: 'topic' }, { title: 'Transportation in Humans (Heart, Blood Vessels, Double Circulation) and Plants (Xylem, Phloem)', topic_type: 'topic' }, { title: 'Excretion in Humans (Nephron Function) and Plant Excretory Products', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'Control and Coordination', topics: [{ title: 'Nervous System: Reflex Arc, Brain Structure, and Functions', topic_type: 'topic' }, { title: 'Tropic Movements in Plants (Phototropism, Geotropism, Hydrotropism, Tropisms)', topic_type: 'topic' }, { title: 'Plant Hormones (Auxins, Gibberellins, Cytokinin, Abscisic Acid)', topic_type: 'topic' }, { title: 'Endocrine Glands in Humans and Hormonal Regulation (Thyroxine, Insulin, Adrenaline)', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'How do Organisms Reproduce?', topics: [{ title: 'Asexual Reproduction Modes in Lower Organisms', topic_type: 'topic' }, { title: 'Sexual Reproduction in Flowering Plants (Pollination and Double Fertilisation)', topic_type: 'topic' }, { title: 'Human Reproductive Systems and Embryonic Development', topic_type: 'topic' }, { title: 'Reproductive Health, STDs, and Birth Control Methods', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'Heredity', topics: [{ title: 'Mendel’s Experiments: Monohybrid and Dihybrid Crosses (Law of Dominance, Segregation)', topic_type: 'topic' }, { title: 'Sex Determination Mechanism in Humans (XX-XY Chromosomes)', topic_type: 'topic' }, { title: 'Note: Evolution sections excluded from Board theory exam per rationalised guidelines', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'Light – Reflection and Refraction', topics: [{ title: 'Reflection by Spherical Mirrors, Mirror Formula (1/f = 1/v + 1/u) and Magnification', topic_type: 'topic' }, { title: 'Refraction, Snell’s Law, Refractive Index, and Critical Angle Concepts', topic_type: 'topic' }, { title: 'Refraction through Lenses, Lens Formula (1/f = 1/v - 1/u) and Power of Lens (P = 1/f)', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'The Human Eye and the Colourful World', topics: [{ title: 'Structure of Human Eye and Accommodation Power', topic_type: 'topic' }, { title: 'Defects of Vision (Myopia, Hypermetropia, Presbyopia) and Corrective Lenses', topic_type: 'topic' }, { title: 'Refraction through Prism, Dispersion, and Recombination', topic_type: 'topic' }, { title: 'Atmospheric Refraction (Twinkling of Stars, Advance Sunrise) and Scattering of Light (Tyndall Effect, Blue Sky)', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'Electricity', topics: [{ title: 'Electric Current, Potential Difference, and Ohm’s Law (V = IR)', topic_type: 'topic' }, { title: 'Resistance, Factors Affecting Resistance, and Resistivity (ρ)', topic_type: 'topic' }, { title: 'Series and Parallel Combination of Resistors', topic_type: 'topic' }, { title: 'Joule’s Heating Effect of Electric Current and Electric Power (P = VI = I²R = V²/R)', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'Magnetic Effects of Electric Current', topics: [{ title: 'Magnetic Field and Field Lines around Straight Conductor, Circular Loop, Solenoid', topic_type: 'topic' }, { title: 'Force on a Current-Carrying Conductor in a Magnetic Field and Fleming’s Left-Hand Rule', topic_type: 'topic' }, { title: 'Domestic Electric Circuits: Fuse, Earthing, Short Circuit, and Overloading', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'Our Environment', topics: [{ title: 'Ecosystem Components, Food Chains, and Food Webs', topic_type: 'topic' }, { title: 'Trophic Levels and 10% Energy Flow Law', topic_type: 'topic' }, { title: 'Ozone Layer Depletion (CFCs) and Waste Management (Biodegradable vs. Non-Biodegradable)', topic_type: 'topic' }] }
    ]
  },
  {
    student_class: '10',
    subject: 'Social Science',
    chapters: [
      // History
      { chapter_number: 1, chapter_name: 'The Rise of Nationalism in Europe', topics: [{ title: 'French Revolution, Napoleon, Liberalism, Unification of Italy and Germany, Visualising the Nation', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'Nationalism in India', topics: [{ title: 'First World War, Khilafat, Non-Cooperation Movement, Salt March, Civil Disobedience, Sense of Collective Belonging', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'The Making of a Global World', topics: [{ title: 'Subtopics 1-1.3 (Pre-modern World to Conquest, Disease and Trade) evaluated in Board Examination; later subtopics for Project Work', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'The Age of Industrialisation', topics: [{ title: 'Excluded from summative Board examination; restricted to periodic assessments', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'Print Culture and the Modern World', topics: [{ title: 'Print in East Asia, Europe, Gutenberg Press, Reading Mania, Print in India and Public Debates', topic_type: 'topic' }] },

      // Geography
      { chapter_number: 6, chapter_name: 'Resources and Development', topics: [{ title: 'Resource Classification, Planning, Land Resources, Soil Classification, Soil Erosion', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'Forest and Wildlife Resources', topics: [{ title: 'Flora/Fauna Depletion, Conservation Systems, Joint Forest Management (JFM)', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'Water Resources', topics: [{ title: 'Water Scarcity, Multi-Purpose River Projects, Rainwater Harvesting Mechanics', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'Agriculture', topics: [{ title: 'Farming Types, Cropping Pattern (Rabi/Kharif/Zaid), Major Crops, Technological/Institutional Reforms', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'Minerals and Energy Resources', topics: [{ title: 'Mode of Occurrence, Metallic/Non-Metallic Minerals, Conventional/Non-Conventional Energy, Conservation', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'Manufacturing Industries', topics: [{ title: 'Importance, Location Factors, Agro-Based/Mineral-Based Industries, Industrial Pollution', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'Lifelines of National Economy', topics: [{ title: 'Theoretical questions excluded from Board examination; Map Work exclusively evaluated', topic_type: 'topic' }] },

      // Political Science
      { chapter_number: 13, chapter_name: 'Power Sharing', topics: [{ title: 'Belgium and Sri Lanka Case Studies, Why Power Sharing is Desirable, Forms of Power Sharing', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'Federalism', topics: [{ title: 'What is Federalism? Federal Features, Decentralisation in India (3-tier system)', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'Gender, Religion and Caste', topics: [{ title: 'Gender division in politics, Religion/Communalism, Caste and Electoral Politics', topic_type: 'topic' }] },
      { chapter_number: 16, chapter_name: 'Political Parties', topics: [{ title: 'Why do we need Political Parties? Functions, National vs. State Parties, Electoral Reforms', topic_type: 'topic' }] },
      { chapter_number: 17, chapter_name: 'Outcomes of Democracy', topics: [{ title: 'Accountable, responsive, legitimate government, Economic growth, Reduction of inequality', topic_type: 'topic' }] },

      // Economics
      { chapter_number: 18, chapter_name: 'Development', topics: [{ title: 'Developmental Goals, National Income, Human Development Index (HDI), Sustainability', topic_type: 'topic' }] },
      { chapter_number: 19, chapter_name: 'Sectors of the Indian Economy', topics: [{ title: 'Primary, Secondary, Tertiary Sectors, GDP Contribution, Organised vs. Unorganised Sectors', topic_type: 'topic' }] },
      { chapter_number: 20, chapter_name: 'Money and Credit', topics: [{ title: 'Money as Medium of Exchange, Modern Currency, Loan Activities, Formal vs. Informal Credit, SHGs', topic_type: 'topic' }] },
      { chapter_number: 21, chapter_name: 'Globalisation and the Indian Economy', topics: [{ title: 'MNCs, Foreign Trade Integration, Drivers of Globalisation, WTO, Impact on India', topic_type: 'topic' }] },
      { chapter_number: 22, chapter_name: 'Consumer Rights', topics: [{ title: 'Prescribed exclusively for Project Work; excluded from written Board theory examination', topic_type: 'topic' }] }
    ]
  },
  {
    student_class: '10',
    subject: 'English',
    chapters: [
      { chapter_number: 1, chapter_name: 'A Letter to God & Poems: Dust of Snow, Fire and Ice', topics: [{ title: 'Reading Comprehension & Poem Analysis', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'Nelson Mandela: Long Walk to Freedom & Poem: A Tiger in the Zoo', topics: [{ title: 'Textual Themes & Character Analysis', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'Two Stories about Flying & Poem: How to Tell Wild Animals', topics: [{ title: 'Prose & Poem Comprehension', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'From the Diary of Anne Frank & Poem: The Ball Poem', topics: [{ title: 'Diary Prose Analysis & Poetic Devices', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'Glimpses of India & Poem: Amanda!', topics: [{ title: 'Prose Sub-units & Poem Theme', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'Mijbil the Otter & Poem: The Trees', topics: [{ title: 'Narrative Prose & Metaphorical Poetry', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'Madam Rides the Bus & Poem: Fog', topics: [{ title: 'Character Study & Imagery Analysis', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'The Sermon at Benares & Poem: The Tale of Custard the Dragon', topics: [{ title: 'Philosophical Discourse & Ballad Poetry', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'The Proposal (Play) & Poem: For Anne Gregory', topics: [{ title: 'Play Analysis & Poetic Dialogue', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'A Triumph of Surgery (Footprints Without Feet)', topics: [{ title: 'Supplementary Prose Comprehension', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'The Thief\'s Story (Footprints Without Feet)', topics: [{ title: 'Character Transformation Analysis', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'The Midnight Visitor (Footprints Without Feet)', topics: [{ title: 'Mystery Narrative Analysis', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'A Question of Trust (Footprints Without Feet)', topics: [{ title: 'Irony & Plot Analysis', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'Footprints Without Feet (Footprints Without Feet)', topics: [{ title: 'Theme Analysis', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'The Making of a Scientist (Footprints Without Feet)', topics: [{ title: 'Biographical Prose Analysis', topic_type: 'topic' }] },
      { chapter_number: 16, chapter_name: 'The Necklace (Guy de Maupassant)', topics: [{ title: 'Short Story Plot Analysis', topic_type: 'topic' }] },
      { chapter_number: 17, chapter_name: 'Bholi (K.A. Abbas)', topics: [{ title: 'Social Message & Character Analysis', topic_type: 'topic' }] },
      { chapter_number: 18, chapter_name: 'The Book that Saved the Earth (Claire Boiko)', topics: [{ title: 'Play Analysis', topic_type: 'topic' }] },
      { chapter_number: 19, chapter_name: 'Grammar: Tenses, Modals, Subject-Verb Concord', topics: [{ title: 'Tenses, Modals, Subject-Verb Agreement Rules', topic_type: 'grammar' }] },
      { chapter_number: 20, chapter_name: 'Grammar: Reported Speech & Determiners', topics: [{ title: 'Commands/Requests, Statements, Questions, Determiners', topic_type: 'grammar' }] }
    ]
  },
  {
    student_class: '10',
    subject: 'Hindi Course A',
    chapters: [
      { chapter_number: 1, chapter_name: 'पद (सूरदास)', topics: [{ title: 'पद व्याख्या एवं भक्ति रस', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'राम-लक्ष्मण-परशुराम संवाद (तुलसीदास)', topics: [{ title: 'काव्य सौंदर्य एवं संवाद विश्लेषण', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'आत्मकथ्य (जयशंकर प्रसाद)', topics: [{ title: 'छायावादी काव्य भावार्थ', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'उत्साह एवं अट नहीं रही है (सूर्यकांत त्रिपाठी \'निराला\')', topics: [{ title: 'कविता व्याख्या एवं प्रतीक बोध', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'यह दंतुरित मुस्कान एवं फसल (नागार्जुन)', topics: [{ title: 'वात्सल्य एवं कृषि संस्कृति भाव', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'संगतकार (मंगलेश डबराल)', topics: [{ title: 'सहायक भूमिका एवं मानवीय संवेदना', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'नेताजी का चश्मा (स्वयं प्रकाश)', topics: [{ title: 'देशभक्ति एवं कहानी चरित्र चित्रण', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'बालगोबिन भगत (रामवृक्ष बेनीपुरी)', topics: [{ title: 'रेखाचित्र एवं कबीरपंथी विचारधारा', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'लखनवी अंदाज़ (यशपाल)', topics: [{ title: 'पतनशील सामंती वर्ग पर व्यंग्य', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'एक कहानी यह भी (मन्नू भंडारी)', topics: [{ title: 'आत्मकथ्य गद्य एवं स्वतंत्रता आंदोलन प्रभाव', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'नौबतखाने में इबादत (यतीन्द्र मिश्र)', topics: [{ title: 'व्यक्ति चित्र (बिस्मिल्ला खाँ)', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'संस्कृति (भदंत आनंद कौसल्यायन)', topics: [{ title: 'सभ्यता एवं संस्कृति भेद निबंध', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'माता का अंचल (शिवपूजन सहाय - कृतिका)', topics: [{ title: 'देहाती दुनिया एवं वात्सल्य भाव', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'साना-साना हाथ जोड़ि... (मधु कांकरिया - कृतिका)', topics: [{ title: 'यात्रा वृत्तांत एवं सिक्किम संस्कृति', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'मैं क्यों लिखता हूँ? (अज्ञेय - कृतिका)', topics: [{ title: 'लेखकीय प्रेरणा एवं हिरोशिमा विवेक', topic_type: 'topic' }] },
      {
        chapter_number: 16,
        chapter_name: 'व्याकरण (Course A: क्षितिज एवं कृतिका)',
        topics: [
          { title: 'रचना के आधार पर वाक्य भेद (सरल, संयुक्त, एवं मिश्र वाक्य)', topic_type: 'grammar' },
          { title: 'वाच्य (कर्तृवाच्य, कर्मवाच्य, एवं भाववाच्य)', topic_type: 'grammar' },
          { title: 'पद परिचय (संज्ञा, सर्वनाम, विशेषण, क्रिया, अव्यय का परिचय)', topic_type: 'grammar' },
          { title: 'अलंकार (शब्दालंकार: श्लेष; अर्थालंकार: उत्प्रेक्षा, अतिशयोक्ति, मानवीकरण)', topic_type: 'grammar' }
        ]
      }
    ]
  },
  {
    student_class: '10',
    subject: 'Hindi Course B',
    chapters: [
      { chapter_number: 1, chapter_name: 'साखी (कबीर)', topics: [{ title: 'साखी व्याख्या एवं गुरु महिमा', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'पद (मीरा)', topics: [{ title: 'कृष्ण भक्ति पद भावार्थ', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'मनुष्यता (मैथिलीशरण गुप्त)', topics: [{ title: 'उदारता एवं परोपकार भाव', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'पर्वत प्रदेश में पावस (सुमित्रानंदन पंत)', topics: [{ title: 'प्रकृति सौंदर्य एवं बिंब विधान', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'तोप (वीरेन डंगवाल)', topics: [{ title: 'ऐतिहासिक धरोहर एवं चेतावनी', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'कर चले हम फ़िदा (कैफ़ी आज़मी)', topics: [{ title: 'देशभक्ति गीत भावार्थ', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'आत्मत्राण (रवींद्रनाथ ठाकुर)', topics: [{ title: 'प्रार्थना कविता भावार्थ', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'बड़े भाई साहब (प्रेमचंद)', topics: [{ title: 'कहानी विश्लेषण एवं बाल मनोविज्ञान', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'डायरी का एक पन्ना (सीताराम सेकसरिया)', topics: [{ title: 'स्वतंत्रता संग्राम संस्मरण', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'तताँरा-वामीरो कथा (लीलाधर मंडलोई)', topics: [{ title: 'लोककथा एवं रूढ़ियों का विरोध', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'तीसरी कसम के शिल्पकार शैलेंद्र (प्रहलाद अग्रवाल)', topics: [{ title: 'फ़िल्म समीक्षा एवं साहित्यिक मूल्य', topic_type: 'topic' }] },
      { chapter_number: 12, chapter_name: 'अब कहाँ दूसरे के दुख से दुखी होने वाले (निदा फ़ाज़ली)', topics: [{ title: 'पर्यावरण एवं मानवीय संवेदनहीनता', topic_type: 'topic' }] },
      { chapter_number: 13, chapter_name: 'पतझर में टूटी पत्तियाँ (रवींद्र केलेकर)', topics: [{ title: 'गिन्नी का सोना एवं झेन की देन पाठ', topic_type: 'topic' }] },
      { chapter_number: 14, chapter_name: 'कारतूस (हबीब तनवीर)', topics: [{ title: 'एकांकी एवं वज़ीर अली का साहस', topic_type: 'topic' }] },
      { chapter_number: 15, chapter_name: 'हरिहर काका (मिथिलेश्वर - संचयन)', topics: [{ title: 'पारिवारिक एवं सामाजिक संबंधों का विघटन', topic_type: 'topic' }] },
      { chapter_number: 16, chapter_name: 'सपनों के-से दिन (गुरुदयाल सिंह - संचयन)', topics: [{ title: 'बालपन संस्मरण पाठ', topic_type: 'topic' }] },
      { chapter_number: 17, chapter_name: 'टोपी शुक्ला (राही मासूम रज़ा - संचयन)', topics: [{ title: 'बालपन की आत्मीयता एवं सांप्रदायिक सौहार्द', topic_type: 'topic' }] },
      {
        chapter_number: 18,
        chapter_name: 'व्याकरण (Course B: स्पर्श एवं संचयन)',
        topics: [
          { title: 'पदबंध (संज्ञा, सर्वनाम, विशेषण, क्रिया, क्रियाविशेषण पदबंध)', topic_type: 'grammar' },
          { title: 'रचना के आधार पर वाक्य रूपांतरण', topic_type: 'grammar' },
          { title: 'समास (तत्पुरुष, कर्मधारय, बहुव्रीहि, द्वंद्व, द्विगु, अव्ययीभाव समास)', topic_type: 'grammar' },
          { title: 'मुहावरे (अर्थ एवं वाक्य प्रयोग)', topic_type: 'grammar' }
        ]
      }
    ]
  },
  {
    student_class: '10',
    subject: 'Sanskrit',
    chapters: [
      { chapter_number: 1, chapter_name: 'शुचिपर्यावरणम्', topics: [{ title: 'पर्यावरण संरक्षण श्लोक पाठ', topic_type: 'topic' }] },
      { chapter_number: 2, chapter_name: 'बुद्धिर्बलवती सदा', topics: [{ title: 'कथा पाठ एवं बुद्धिमत्ता', topic_type: 'topic' }] },
      { chapter_number: 3, chapter_name: 'शिशुलालनम्', topics: [{ title: 'नाट्यांश पाठ एवं वात्सल्य भाव', topic_type: 'topic' }] },
      { chapter_number: 4, chapter_name: 'जननी तुल्यवत्सला', topics: [{ title: 'महाभारत कथा एवं मातृ स्नेह', topic_type: 'topic' }] },
      { chapter_number: 5, chapter_name: 'सुभाषितानि', topics: [{ title: 'सदाचार एवं नीति श्लोक', topic_type: 'topic' }] },
      { chapter_number: 6, chapter_name: 'सौहार्दं प्रकृतेः शोभा', topics: [{ title: 'पर्यावरण एवं प्राणी सौहार्द नाटक', topic_type: 'topic' }] },
      { chapter_number: 7, chapter_name: 'विचित्रः साक्षी', topics: [{ title: 'न्याय एवं निर्दोषता कथा', topic_type: 'topic' }] },
      { chapter_number: 8, chapter_name: 'सूक्तयः', topics: [{ title: 'सुभाषित वचन बोध', topic_type: 'topic' }] },
      { chapter_number: 9, chapter_name: 'भूकम्पविभीषिका', topics: [{ title: 'आपदा प्रबंधन एवं प्राकृतिक प्रकोप', topic_type: 'topic' }] },
      { chapter_number: 10, chapter_name: 'प्राणेभ्योऽपि प्रियः सुहृद्', topics: [{ title: 'चाणक्य-चन्दनदास कथा', topic_type: 'topic' }] },
      { chapter_number: 11, chapter_name: 'संस्कृत व्याकरणम्', topics: [{ title: 'व्यञ्जन/विसर्ग सन्धि, समास (तत्पुरुष/कर्मधारय/द्विगु/बहुव्रीहि/द्वंद्व/अव्ययीभाव), मतुप्/ठक्/त्व/तल् प्रत्यय', topic_type: 'grammar' }] }
    ]
  }
];

export async function runSyllabusSeed(supabaseClient) {
  console.log('Starting Authoritative 2026-27 Syllabus Seed Script...');

  // 1. Process each class and subject in SYLLABUS_2026_DATA
  for (const group of SYLLABUS_2026_DATA) {
    const studentClass = group.student_class;
    const subject = group.subject;

    console.log(`Processing Class ${studentClass} - ${subject}...`);

    for (const chData of group.chapters) {
      // Find or insert chapter
      const { data: existingChapters, error: fetchChErr } = await supabaseClient
        .from('chapters')
        .select('id, chapter_number, chapter_name')
        .or(`student_class.eq.${studentClass},student_class.eq.Class ${studentClass}`)
        .eq('subject', subject)
        .eq('chapter_number', chData.chapter_number);

      if (fetchChErr) {
        console.error(`Error fetching chapter ${chData.chapter_number} for Class ${studentClass} ${subject}:`, fetchChErr);
        continue;
      }

      let chapterId = null;

      if (existingChapters && existingChapters.length > 0) {
        chapterId = existingChapters[0].id;
        // Update chapter_name if needed
        if (existingChapters[0].chapter_name !== chData.chapter_name) {
          await supabaseClient
            .from('chapters')
            .update({ chapter_name: chData.chapter_name })
            .eq('id', chapterId);
        }
      } else {
        // Insert new chapter
        const { data: insertedCh, error: insChErr } = await supabaseClient
          .from('chapters')
          .insert({
            student_class: studentClass,
            subject: subject,
            chapter_number: chData.chapter_number,
            chapter_name: chData.chapter_name,
            display_order: chData.chapter_number,
            is_active: true
          })
          .select('id')
          .single();

        if (insChErr) {
          console.error(`Error inserting chapter ${chData.chapter_number} for Class ${studentClass} ${subject}:`, insChErr);
          continue;
        }
        chapterId = insertedCh.id;
      }

      if (!chapterId) continue;

      // Upsert syllabus topics for this chapter
      let displayOrder = 1;
      for (const tData of chData.topics) {
        const { data: existingTopics, error: fetchTopErr } = await supabaseClient
          .from('syllabus_topics')
          .select('id')
          .eq('chapter_id', chapterId)
          .eq('title', tData.title);

        if (fetchTopErr) {
          console.error(`Error fetching topic ${tData.title} for chapter ${chapterId}:`, fetchTopErr);
          continue;
        }

        if (existingTopics && existingTopics.length > 0) {
          // Update existing topic
          await supabaseClient
            .from('syllabus_topics')
            .update({
              description: tData.description || null,
              topic_type: tData.topic_type || 'topic',
              display_order: displayOrder,
              is_active: true
            })
            .eq('id', existingTopics[0].id);
        } else {
          // Insert new topic
          await supabaseClient
            .from('syllabus_topics')
            .insert({
              chapter_id: chapterId,
              title: tData.title,
              description: tData.description || null,
              topic_type: tData.topic_type || 'topic',
              display_order: displayOrder,
              is_active: true
            });
        }
        displayOrder++;
      }
    }
  }

  // 2. Confident Topic-Resource Mapping logic
  // Inspect existing learning resources that have topic-specific information or matches
  console.log('Mapping confident topic-level resources...');
  const { data: notesResources, error: fetchResErr } = await supabaseClient
    .from('learning_resources')
    .select('id, title, chapter_id, student_class, subject, medium')
    .not('chapter_id', 'is', null);

  if (!fetchResErr && notesResources) {
    for (const res of notesResources) {
      // Find topics under this chapter that explicitly match topic-level titles if any
      const { data: chTopics } = await supabaseClient
        .from('syllabus_topics')
        .select('id, title')
        .eq('chapter_id', res.chapter_id);

      if (chTopics && chTopics.length > 0) {
        for (const topic of chTopics) {
          // Check if resource title explicitly references exercise or topic name (e.g. "Exercise 1.1")
          if (res.title && topic.title && res.title.toLowerCase().includes(topic.title.toLowerCase())) {
            await supabaseClient
              .from('syllabus_topic_resources')
              .upsert({
                topic_id: topic.id,
                resource_id: res.id
              }, { onConflict: 'topic_id,resource_id' });
          }
        }
      }
    }
  }

  console.log('Syllabus seed complete!');
}

export async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in environment variables.');
    return;
  }
  const supabase = createClient(supabaseUrl, supabaseKey);
  await runSyllabusSeed(supabase);
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && currentFilePath === process.argv[1]) {
  run();
}

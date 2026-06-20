import React from 'react';
import { Link } from 'react-router-dom';
import { mockAnnouncements, mockResources, mockCategories } from '../../data/mock';

const Home: React.FC = () => {
  const latestUploads = mockResources.slice(0, 3); // Get 3 latest uploads

  return (
    <div>
      {/* Hero Section */}
      <section className="p-6 text-center bg-paper border-2 border-ink mb-6 shadow-elevated">
        <h2 className="text-h1 uppercase mb-4">Welcome to Horizon</h2>
        <p className="text-body1 font-bold mb-6 max-w-2xl mx-auto">Your one-stop platform for educational resources, notes, and previous year papers.</p>
        <Link to="/library" className="inline-block p-2">
          <button className="btn btn-filled">Explore Library</button>
        </Link>
      </section>

      <div className="flex gap-6 flex-wrap">
        {/* Main Content Area */}
        <div className="flex-[3] min-w-[300px]">

          {/* Latest Uploads */}
          <section className="mb-6">
            <h3 className="text-h2 uppercase mb-4 border-b-2 border-ink pb-2">Latest Uploads</h3>
            <div className="flex flex-col gap-4">
              {latestUploads.map(resource => (
                <div key={resource.id} className="border-2 border-ink p-4 bg-paper rounded-md shadow-elevated">
                  <h4 className="text-h2 mb-2">{resource.title}</h4>
                  <p className="text-body1 mb-4">{resource.description}</p>
                  <Link to={`/resource/${resource.id}`} className="inline-block p-3 font-bold underline decoration-2 underline-offset-4 hover:bg-accent-yellow">View Details</Link>
                </div>
              ))}
            </div>
          </section>

          {/* Categories / Resource Types */}
          <section className="mb-6">
            <h3 className="text-h2 uppercase mb-4 border-b-2 border-ink pb-2">Browse by Category</h3>
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 list-none p-0 m-0">
              {mockCategories.map(category => (
                <li key={category} className="border-2 border-ink bg-paper hover:bg-surface hover:-translate-y-1 transition-transform text-center rounded-none font-bold shadow-elevated cursor-pointer">
                  <Link to={`/library?category=${category}`} className="no-underline text-ink block w-full p-4 min-h-[44px] flex items-center justify-center">
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sidebar / Announcements */}
        <aside className="flex-1 min-w-[250px]">
          <section className="border-2 border-ink p-4 bg-paper shadow-elevated">
            <h3 className="text-h2 font-bold uppercase mb-4 border-b-2 border-ink pb-2">Announcements</h3>
            <ul className="list-none p-0 m-0">
              {mockAnnouncements.map((announcement, index) => (
                <li key={announcement.id} className={`mb-4 pb-2 ${index !== mockAnnouncements.length - 1 ? 'border-b-2 border-ink' : ''}`}>
                  <h4 className="m-0 mb-2 font-bold text-body1">{announcement.title}</h4>
                  <p className="m-0 mb-2 text-caption">{announcement.description}</p>
                  <small className="font-bold bg-accent-yellow p-1 border-2 border-ink inline-block min-h-[32px]">{new Date(announcement.date).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default Home;

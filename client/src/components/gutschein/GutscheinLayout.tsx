import React, { ReactNode } from 'react';
import Layout from '../layout/Layout';
import { Camera } from 'lucide-react';

interface GutscheinLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  image: string;
}

const GutscheinLayout: React.FC<GutscheinLayoutProps> = ({ children, title, subtitle, image }) => {
  return (
    <Layout>
      {/* Hero Section */}
      <section 
        className="relative h-[60vh] bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
            <p className="text-xl md:text-2xl">{subtitle}</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {children}
        </div>
      </section>
    </Layout>
  );
};

export default GutscheinLayout;
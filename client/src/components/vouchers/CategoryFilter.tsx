import React from 'react';
import { Category } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';

const CategoryFilter: React.FC = () => {
  const { categories, selectedCategory, setSelectedCategory } = useAppContext();
  const { t } = useLanguage();

  const handleCategoryChange = (category: Category | null) => {
    setSelectedCategory(category);
  };

  const translateCategory = (category: Category) => {
    switch (category) {
      case 'Familie': return t('categories.family');
      case 'Baby': return t('categories.baby');
      case 'Hochzeit': return t('categories.wedding');
      case 'Business': return t('categories.business');
      case 'Event': return t('categories.event');
      default: return category;
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4 text-gray-800">{t('vouchers.filterByCategory')}</h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {t('common.all')}
        </button>
        
        {categories.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {translateCategory(category)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
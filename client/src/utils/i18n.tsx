// i18n configuration and translation utilities
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'nl' | 'ja' | 'ko' | 'zh';

export interface Translation {
  [key: string]: string | Translation;
}

export interface Translations {
  [language: string]: Translation;
}

// Translation context
interface I18nContextType {
  currentLanguage: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: Translations;
}

const I18nContext = createContext<I18nContextType | null>(null);

// Default translations
const defaultTranslations: Translations = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      warning: 'Warning',
      info: 'Information',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      close: 'Close',
      back: 'Back',
      next: 'Next',
      previous: 'Previous',
      search: 'Search',
      filter: 'Filter',
      export: 'Export',
      import: 'Import',
      print: 'Print',
      share: 'Share',
      copy: 'Copy',
      download: 'Download',
      upload: 'Upload'
    },
    navigation: {
      home: 'Home',
      about: 'About',
      services: 'Services',
      portfolio: 'Portfolio',
      blog: 'Blog',
      contact: 'Contact',
      admin: 'Admin',
      dashboard: 'Dashboard',
      logout: 'Logout',
      login: 'Login'
    },
    admin: {
      dashboard: 'Dashboard',
      questionnaires: 'Questionnaires',
      clients: 'Clients',
      invoices: 'Invoices',
      reports: 'Reports',
      settings: 'Settings',
      users: 'Users',
      gallery: 'Gallery',
      newsletter: 'Newsletter',
      calendar: 'Calendar'
    },
    forms: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      message: 'Message',
      subject: 'Subject',
      company: 'Company',
      website: 'Website',
      budget: 'Budget',
      timeline: 'Timeline',
      description: 'Description',
      requirements: 'Requirements'
    },
    messages: {
      required: 'This field is required',
      invalid_email: 'Please enter a valid email address',
      invalid_phone: 'Please enter a valid phone number',
      form_submitted: 'Form submitted successfully',
      form_error: 'There was an error submitting the form',
      data_saved: 'Data saved successfully',
      data_deleted: 'Data deleted successfully',
      confirmation_required: 'Are you sure you want to delete this item?'
    }
  },
  es: {
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
      warning: 'Advertencia',
      info: 'Información',
      yes: 'Sí',
      no: 'No',
      ok: 'OK',
      close: 'Cerrar',
      back: 'Atrás',
      next: 'Siguiente',
      previous: 'Anterior',
      search: 'Buscar',
      filter: 'Filtrar',
      export: 'Exportar',
      import: 'Importar',
      print: 'Imprimir',
      share: 'Compartir',
      copy: 'Copiar',
      download: 'Descargar',
      upload: 'Subir'
    },
    navigation: {
      home: 'Inicio',
      about: 'Acerca de',
      services: 'Servicios',
      portfolio: 'Portafolio',
      blog: 'Blog',
      contact: 'Contacto',
      admin: 'Admin',
      dashboard: 'Panel',
      logout: 'Cerrar Sesión',
      login: 'Iniciar Sesión'
    },
    admin: {
      dashboard: 'Panel de Control',
      questionnaires: 'Cuestionarios',
      clients: 'Clientes',
      invoices: 'Facturas',
      reports: 'Reportes',
      settings: 'Configuración',
      users: 'Usuarios',
      gallery: 'Galería',
      newsletter: 'Boletín',
      calendar: 'Calendario'
    },
    forms: {
      name: 'Nombre',
      email: 'Correo',
      phone: 'Teléfono',
      message: 'Mensaje',
      subject: 'Asunto',
      company: 'Empresa',
      website: 'Sitio Web',
      budget: 'Presupuesto',
      timeline: 'Cronograma',
      description: 'Descripción',
      requirements: 'Requisitos'
    },
    messages: {
      required: 'Este campo es requerido',
      invalid_email: 'Por favor ingrese un correo válido',
      invalid_phone: 'Por favor ingrese un teléfono válido',
      form_submitted: 'Formulario enviado exitosamente',
      form_error: 'Hubo un error al enviar el formulario',
      data_saved: 'Datos guardados exitosamente',
      data_deleted: 'Datos eliminados exitosamente',
      confirmation_required: '¿Está seguro que desea eliminar este elemento?'
    }
  },
  fr: {
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      loading: 'Chargement...',
      error: 'Erreur',
      success: 'Succès',
      warning: 'Avertissement',
      info: 'Information',
      yes: 'Oui',
      no: 'Non',
      ok: 'OK',
      close: 'Fermer',
      back: 'Retour',
      next: 'Suivant',
      previous: 'Précédent',
      search: 'Rechercher',
      filter: 'Filtrer',
      export: 'Exporter',
      import: 'Importer',
      print: 'Imprimer',
      share: 'Partager',
      copy: 'Copier',
      download: 'Télécharger',
      upload: 'Téléverser'
    },
    navigation: {
      home: 'Accueil',
      about: 'À propos',
      services: 'Services',
      portfolio: 'Portfolio',
      blog: 'Blog',
      contact: 'Contact',
      admin: 'Admin',
      dashboard: 'Tableau de bord',
      logout: 'Déconnexion',
      login: 'Connexion'
    },
    admin: {
      dashboard: 'Tableau de bord',
      questionnaires: 'Questionnaires',
      clients: 'Clients',
      invoices: 'Factures',
      reports: 'Rapports',
      settings: 'Paramètres',
      users: 'Utilisateurs',
      gallery: 'Galerie',
      newsletter: 'Newsletter',
      calendar: 'Calendrier'
    },
    forms: {
      name: 'Nom',
      email: 'E-mail',
      phone: 'Téléphone',
      message: 'Message',
      subject: 'Sujet',
      company: 'Entreprise',
      website: 'Site Web',
      budget: 'Budget',
      timeline: 'Chronologie',
      description: 'Description',
      requirements: 'Exigences'
    },
    messages: {
      required: 'Ce champ est requis',
      invalid_email: 'Veuillez saisir une adresse e-mail valide',
      invalid_phone: 'Veuillez saisir un numéro de téléphone valide',
      form_submitted: 'Formulaire soumis avec succès',
      form_error: 'Une erreur s\'est produite lors de la soumission du formulaire',
      data_saved: 'Données sauvegardées avec succès',
      data_deleted: 'Données supprimées avec succès',
      confirmation_required: 'Êtes-vous sûr de vouloir supprimer cet élément?'
    }
  }
};

// Translation function
const translate = (translations: Translation, key: string, params?: Record<string, string | number>): string => {
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Replace parameters in translation
  if (params) {
    let result = value;
    Object.entries(params).forEach(([param, val]) => {
      result = result.replace(new RegExp(`{{${param}}}`, 'g'), String(val));
    });
    return result;
  }

  return value;
};

// I18n Provider Component
interface I18nProviderProps {
  children: ReactNode;
  defaultLanguage?: SupportedLanguage;
  translations?: Translations;
}

export const I18nProvider = ({ 
  children, 
  defaultLanguage = 'en', 
  translations = defaultTranslations 
}: I18nProviderProps) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(defaultLanguage);

  // Load saved language from localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language') as SupportedLanguage;
    if (savedLanguage && translations[savedLanguage]) {
      setCurrentLanguage(savedLanguage);
    }
  }, [translations]);

  const setLanguage = (language: SupportedLanguage) => {
    setCurrentLanguage(language);
    localStorage.setItem('app-language', language);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const languageTranslations = translations[currentLanguage] || translations.en;
    return translate(languageTranslations, key, params);
  };

  return (
    <I18nContext.Provider value={{
      currentLanguage,
      setLanguage,
      t,
      translations
    }}>
      {children}
    </I18nContext.Provider>
  );
};

// Hook to use i18n
export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// Language selector component
export const LanguageSelector = () => {
  const { currentLanguage, setLanguage } = useI18n();

  const languages: { code: SupportedLanguage; name: string; flag: string }[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ];

  return (
    <div className="relative">
      <select
        value={currentLanguage}
        onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
        className="bg-white border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
};

// Export default translations for extending
export { defaultTranslations };

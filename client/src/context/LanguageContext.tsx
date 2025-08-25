import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Language = 'en' | 'de';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    'nav.home': 'Home',
    'nav.photoshoots': 'Photoshoots',
    'nav.vouchers': 'Vouchers',
    'nav.blog': 'Blog',
    'nav.waitlist': 'Waitlist',
    'nav.contact': 'Contact',
    'nav.gallery': 'My Gallery',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    'nav.admin': 'Admin Dashboard',
    'nav.galleries': 'Client Galleries',
    'nav.myGallery': 'My Gallery',
    'newsletter.signup': 'Sign up for newsletter',
    'newsletter.thanks': 'Thank you for signing up! Please check your email for the voucher.',
    'newsletter.button': 'Sign up',
    'newsletter.placeholder': 'Your email address',
    'newsletter.error': 'An error occurred. Please try again later.',
    
    // Admin interface
    'admin.dashboard': 'Admin Dashboard',
    'admin.clients': 'Clients',
    'admin.invoices': 'Invoices',
    'admin.galleries': 'Galleries',
    'admin.blog': 'Blog Posts',
    'admin.surveys': 'Surveys',
    'admin.reports': 'Reports',
    'admin.digitalFiles': 'Digital Files',
    
    // Common actions
    'action.create': 'Create',
    'action.edit': 'Edit',
    'action.delete': 'Delete',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.view': 'View',
    'action.search': 'Search',
    'action.filter': 'Filter',
    'action.import': 'Import',
    'action.export': 'Export',
    'action.duplicate': 'Duplicate',
    'action.preview': 'Preview',
    'action.download': 'Download',
    'action.upload': 'Upload',
    'action.submit': 'Submit',
    'action.confirm': 'Confirm',
    'action.close': 'Close',
    'action.back': 'Back',
    'action.next': 'Next',
    'action.previous': 'Previous',
    'action.add': 'Add',
    'action.remove': 'Remove',
    'action.update': 'Update',
    
    // Status
    'status.active': 'Active',
    'status.inactive': 'Inactive',
    'status.draft': 'Draft',
    'status.published': 'Published',
    'status.scheduled': 'Scheduled',
    'status.archived': 'Archived',
    'status.pending': 'Pending',
    'status.completed': 'Completed',
    'status.cancelled': 'Cancelled',
    'status.paid': 'Paid',
    'status.unpaid': 'Unpaid',
    'status.overdue': 'Overdue',
    'status.sent': 'Sent',
    'status.shared': 'Shared',
    
    // Forms
    'form.title': 'Title',
    'form.name': 'Name',
    'form.email': 'Email',
    'form.phone': 'Phone',
    'form.address': 'Address',
    'form.description': 'Description',
    'form.notes': 'Notes',
    'form.date': 'Date',
    'form.time': 'Time',
    'form.price': 'Price',
    'form.quantity': 'Quantity',
    'form.total': 'Total',
    'form.status': 'Status',
    'form.category': 'Category',
    'form.tags': 'Tags',
    'form.required': 'Required',
    'form.optional': 'Optional',
    'form.password': 'Password',
    'form.confirmPassword': 'Confirm Password',
    
    // Messages
    'message.success': 'Success',
    'message.error': 'Error',
    'message.warning': 'Warning',
    'message.info': 'Information',
    'message.loading': 'Loading...',
    'message.saving': 'Saving...',
    'message.deleting': 'Deleting...',
    'message.noData': 'No data available',
    'message.noResults': 'No results found',
    'message.confirmDelete': 'Are you sure you want to delete this item?',
    'message.unsavedChanges': 'You have unsaved changes',
    
    // Pages
    'page.home': 'Home',
    'page.contact': 'Contact',
    'page.about': 'About',
    'page.services': 'Services',
    'page.portfolio': 'Portfolio',
    'page.blog': 'Blog',
    'page.galleries': 'Galleries',
    'page.invoices': 'Invoices',
    'page.clients': 'Clients',
    'page.dashboard': 'Dashboard',
    'page.reports': 'Reports',
    'page.settings': 'Settings',
    'page.profile': 'Profile',
    'page.login': 'Login',
    'page.register': 'Register',
      // Gallery
    'gallery.create': 'Create Gallery',
    'gallery.edit': 'Edit Gallery',
    'gallery.images': 'Images',
    'gallery.upload': 'Upload Images',
    'gallery.password': 'Password Protection',
    'gallery.downloadEnabled': 'Download Enabled',
    'gallery.settings': 'Gallery Settings',  
    'gallery.preview': 'Gallery Preview',
    'gallery.share': 'Share Gallery',
    'gallery.noImages': 'No images uploaded yet',    // Blog
    'blog.create': 'Create Post',
    'blog.edit': 'Edit Post',
    'blog.manage_content': 'Manage your blog content',
    'blog.search_posts': 'Search posts...',
    'blog.no_excerpt': 'No excerpt',
    'blog.no_image': 'No img',
    'blog.post': 'Post',
    'blog.publish': 'Publish',
    'blog.unpublish': 'Unpublish',
    'blog.no_posts_found': 'No posts found matching your criteria.',
    'blog.create_first_post': 'Create your first post',
    
    // Pagination
    'pagination.showing': 'Showing',
    'pagination.of': 'of',
    'pagination.results': 'results',
    
    // Modal
    'modal.confirm_deletion': 'Confirm Deletion',
    'modal.delete_post_warning': 'Are you sure you want to delete this post? This action cannot be undone.',
    
    // Table
    'table.actions': 'Actions',
      // Filters
    'filter.all_statuses': 'All Statuses',
      // Clients
    'clients.add': 'Add Client',
    'clients.search': 'Search clients...',  
    'clients.import_logs': 'Import Logs',
    'clients.more_filters': 'More Filters',
    'clients.no_phone': 'No phone number',
    'clients.since': 'Client since',
    
    // Messages
    'message.error.failed_to_update_post_status': 'Failed to update post status. Please try again.',
    
    // Invoice
    'invoice.create': 'Create Invoice',
    'invoice.edit': 'Edit Invoice',
    'invoice.items': 'Invoice Items',
    'invoice.summary': 'Invoice Summary',
    'invoice.total': 'Total',
    'invoice.subtotal': 'Subtotal',
    'invoice.tax': 'Tax',
    'invoice.discount': 'Discount',
    'invoice.dueDate': 'Due Date',
    'invoice.paymentTerms': 'Payment Terms',
    'invoice.clientDetails': 'Client Details',
    'invoice.invoiceDetails': 'Invoice Details',
    'invoice.lineItems': 'Line Items',
    'invoice.management': 'Invoice Management',
    'invoice.totalInvoiced': 'Total Invoiced',
    'invoice.paidAmount': 'Paid Amount',
    'invoice.overdueAmount': 'Overdue Amount',
    
    // Survey
    'survey.create': 'Create Survey',
    'survey.edit': 'Edit Survey',
    'survey.questions': 'Questions',
    'survey.responses': 'Responses',
    'survey.analytics': 'Analytics',
    'survey.publish': 'Publish',
    'survey.unpublish': 'Unpublish',
    'survey.builder': 'Survey Builder',
    'survey.preview': 'Preview Survey',
    'survey.loadError': 'Unable to Load Survey',
    'survey.progress': 'Progress',
    
    // Calendar
    'calendar.title': 'Calendar',
    'calendar.create': 'Create Event',
    'calendar.edit': 'Edit Event',
    'calendar.delete': 'Delete Event',
    'calendar.export': 'Export Calendar',
    'calendar.import': 'Import Calendar',
    'calendar.integration': 'Calendar Integration',
    'calendar.sync': 'Sync Settings',
    'calendar.autoSync': 'Auto Sync',
    'calendar.visibility': 'Visibility',
    'calendar.priority': 'Priority',
    'calendar.repeat': 'Repeat',
    'calendar.daily': 'Daily',
    'calendar.weekly': 'Weekly',
    'calendar.monthly': 'Monthly',
    'calendar.yearly': 'Yearly',
    'calendar.public': 'Public',
    'calendar.private': 'Private',
    'calendar.confidential': 'Confidential',
    'calendar.low': 'Low',
    'calendar.normal': 'Normal',
    'calendar.high': 'High',
    
    // Email/Inbox
    'email.inbox': 'Inbox',
    'email.compose': 'Compose',
    'email.send': 'Send',
    'email.reply': 'Reply',
    'email.forward': 'Forward',
    'email.delete': 'Delete',
    'email.archive': 'Archive',
    'email.star': 'Star',
    'email.unread': 'Unread',
    'email.read': 'Read',
    'email.subject': 'Subject',
    'email.from': 'From',
    'email.to': 'To',
    'email.cc': 'CC',
    'email.bcc': 'BCC',
    'email.priority': 'Priority',
    'email.attachment': 'Attachment',
    'email.noEmails': 'No emails found',
    'email.selectEmail': 'Select an email',
    'email.accounts': 'Accounts',
    'email.folders': 'Folders',
    'email.settings': 'Email Settings',
    'email.sync': 'Sync',
    'email.assistant': 'AI Email Assistant',
    'email.automation': 'Automation Hub',
    
    // File uploads
    'file.upload': 'Upload File',
    'file.choose': 'Choose File',
    'file.dragDrop': 'or drag and drop them here',
    'file.processing': 'Processing file...',
    'file.error': 'File upload error',
    'file.success': 'File uploaded successfully',
    
    // Common phrases
    'common.all': 'All',
    'common.none': 'None',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.or': 'or',
    'common.and': 'and',
    'common.of': 'of',
    'common.in': 'in',
    'common.on': 'on',
    'common.at': 'at',
    'common.by': 'by',
    'common.from': 'from',
    'common.to': 'to',
    'common.with': 'with',
    'common.without': 'without',
    'common.today': 'Today',
    'common.yesterday': 'Yesterday',
    'common.tomorrow': 'Tomorrow',
    'common.week': 'Week',
    'common.month': 'Month',
    'common.year': 'Year',
    'common.date': 'Date',
    'common.time': 'Time',
    'common.language': 'Language',
    'common.currency': 'Currency',
    'common.timezone': 'Timezone',
    
    // Location/Contact
    'contact.streetParking': 'Street parking available'
  },
  de: {
    'nav.home': 'Startseite',
    'nav.photoshoots': 'Fotoshootings',
    'nav.vouchers': 'Gutscheine',
    'nav.blog': 'Blog',
    'nav.waitlist': 'Warteliste',
    'nav.contact': 'Kontakt',
    'nav.gallery': 'Meine Galerie',
    'nav.login': 'Anmelden',
    'nav.logout': 'Abmelden',
    'nav.admin': 'Admin-Dashboard',
    'nav.galleries': 'Kundengalerien',
    'nav.myGallery': 'Meine Galerie',
    'newsletter.signup': 'Sichern Sie sich einen Fotoshooting-Gutschein im Wert von €50 Print Guthaben.',
    'newsletter.thanks': 'Vielen Dank für Ihre Anmeldung! Bitte prüfen Sie Ihre E-Mails für den Gutschein.',
    'newsletter.button': 'Anmelden',
    'newsletter.placeholder': 'Ihre E-Mail-Adresse',
    'newsletter.error': 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
    
    // Admin interface
    'admin.dashboard': 'Admin-Dashboard',
    'admin.clients': 'Kunden',
    'admin.invoices': 'Rechnungen',
    'admin.galleries': 'Galerien',
    'admin.blog': 'Blog-Beiträge',
    'admin.surveys': 'Umfragen',
    'admin.reports': 'Berichte',
    'admin.digitalFiles': 'Digitale Dateien',
    
    // Common actions
    'action.create': 'Erstellen',
    'action.edit': 'Bearbeiten',
    'action.delete': 'Löschen',
    'action.save': 'Speichern',
    'action.cancel': 'Abbrechen',
    'action.view': 'Anzeigen',
    'action.search': 'Suchen',
    'action.filter': 'Filtern',
    'action.import': 'Importieren',
    'action.export': 'Exportieren',
    'action.duplicate': 'Duplizieren',
    'action.preview': 'Vorschau',
    'action.download': 'Herunterladen',
    'action.upload': 'Hochladen',
    'action.submit': 'Senden',
    'action.confirm': 'Bestätigen',
    'action.close': 'Schließen',
    'action.back': 'Zurück',
    'action.next': 'Weiter',
    'action.previous': 'Zurück',
    'action.add': 'Hinzufügen',
    'action.remove': 'Entfernen',
    'action.update': 'Aktualisieren',
    
    // Status
    'status.active': 'Aktiv',
    'status.inactive': 'Inaktiv',
    'status.draft': 'Entwurf',
    'status.published': 'Veröffentlicht',
    'status.scheduled': 'Geplant',
    'status.archived': 'Archiviert',
    'status.pending': 'Ausstehend',
    'status.completed': 'Abgeschlossen',
    'status.cancelled': 'Storniert',
    'status.paid': 'Bezahlt',
    'status.unpaid': 'Unbezahlt',
    'status.overdue': 'Überfällig',
    'status.sent': 'Gesendet',
    'status.shared': 'Geteilt',
    
    // Forms
    'form.title': 'Titel',
    'form.name': 'Name',
    'form.email': 'E-Mail',
    'form.phone': 'Telefon',
    'form.address': 'Adresse',
    'form.description': 'Beschreibung',
    'form.notes': 'Notizen',
    'form.date': 'Datum',
    'form.time': 'Zeit',
    'form.price': 'Preis',
    'form.quantity': 'Anzahl',
    'form.total': 'Gesamt',
    'form.status': 'Status',
    'form.category': 'Kategorie',
    'form.tags': 'Tags',
    'form.required': 'Erforderlich',
    'form.optional': 'Optional',
    'form.password': 'Passwort',
    'form.confirmPassword': 'Passwort bestätigen',
    
    // Messages
    'message.success': 'Erfolgreich',
    'message.error': 'Fehler',
    'message.warning': 'Warnung',
    'message.info': 'Information',
    'message.loading': 'Lädt...',
    'message.saving': 'Speichert...',
    'message.deleting': 'Löscht...',
    'message.noData': 'Keine Daten verfügbar',
    'message.noResults': 'Keine Ergebnisse gefunden',
    'message.confirmDelete': 'Sind Sie sicher, dass Sie dieses Element löschen möchten?',
    'message.unsavedChanges': 'Sie haben ungespeicherte Änderungen',
    
    // Pages
    'page.home': 'Startseite',
    'page.contact': 'Kontakt',
    'page.about': 'Über uns',
    'page.services': 'Dienstleistungen',
    'page.portfolio': 'Portfolio',
    'page.blog': 'Blog',
    'page.galleries': 'Galerien',
    'page.invoices': 'Rechnungen',
    'page.clients': 'Kunden',
    'page.dashboard': 'Dashboard',
    'page.reports': 'Berichte',
    'page.settings': 'Einstellungen',
    'page.profile': 'Profil',
    'page.login': 'Anmelden',
    'page.register': 'Registrieren',
    
    // Gallery
    'gallery.create': 'Galerie erstellen',
    'gallery.edit': 'Galerie bearbeiten',
    'gallery.images': 'Bilder',
    'gallery.upload': 'Bilder hochladen',
    'gallery.password': 'Passwort-Schutz',
    'gallery.downloadEnabled': 'Download aktiviert',
    'gallery.settings': 'Galerie-Einstellungen',
    'gallery.preview': 'Galerie-Vorschau',
    'gallery.share': 'Galerie teilen',
    'gallery.noImages': 'Noch keine Bilder hochgeladen',
    
    // Invoice
    'invoice.create': 'Rechnung erstellen',
    'invoice.edit': 'Rechnung bearbeiten',
    'invoice.items': 'Rechnungsposten',
    'invoice.summary': 'Rechnungsübersicht',
    'invoice.total': 'Gesamt',
    'invoice.subtotal': 'Zwischensumme',
    'invoice.tax': 'Steuer',
    'invoice.discount': 'Rabatt',
    'invoice.dueDate': 'Fälligkeitsdatum',
    'invoice.paymentTerms': 'Zahlungsbedingungen',
    'invoice.clientDetails': 'Kundendetails',
    'invoice.invoiceDetails': 'Rechnungsdetails',
    'invoice.lineItems': 'Positionen',
    'invoice.management': 'Rechnungsverwaltung',
    'invoice.totalInvoiced': 'Gesamt in Rechnung gestellt',
    'invoice.paidAmount': 'Bezahlter Betrag',
    'invoice.overdueAmount': 'Überfälliger Betrag',
    
    // Survey
    'survey.create': 'Umfrage erstellen',
    'survey.edit': 'Umfrage bearbeiten',
    'survey.questions': 'Fragen',
    'survey.responses': 'Antworten',
    'survey.analytics': 'Analytik',
    'survey.publish': 'Veröffentlichen',
    'survey.unpublish': 'Unveröffentlichen',
    'survey.builder': 'Umfrage-Builder',
    'survey.preview': 'Umfrage-Vorschau',
    'survey.loadError': 'Umfrage konnte nicht geladen werden',
    'survey.progress': 'Fortschritt',
    
    // Calendar
    'calendar.title': 'Kalender',
    'calendar.create': 'Termin erstellen',
    'calendar.edit': 'Termin bearbeiten',
    'calendar.delete': 'Termin löschen',
    'calendar.export': 'Kalender exportieren',
    'calendar.import': 'Kalender importieren',
    'calendar.integration': 'Kalender-Integration',
    'calendar.sync': 'Sync-Einstellungen',
    'calendar.autoSync': 'Auto-Sync',
    'calendar.visibility': 'Sichtbarkeit',
    'calendar.priority': 'Priorität',
    'calendar.repeat': 'Wiederholen',
    'calendar.daily': 'Täglich',
    'calendar.weekly': 'Wöchentlich',
    'calendar.monthly': 'Monatlich',
    'calendar.yearly': 'Jährlich',
    'calendar.public': 'Öffentlich',
    'calendar.private': 'Privat',
    'calendar.confidential': 'Vertraulich',
    'calendar.low': 'Niedrig',
    'calendar.normal': 'Normal',
    'calendar.high': 'Hoch',
    
    // Email/Inbox
    'email.inbox': 'Posteingang',
    'email.compose': 'Verfassen',
    'email.send': 'Senden',
    'email.reply': 'Antworten',
    'email.forward': 'Weiterleiten',
    'email.delete': 'Löschen',
    'email.archive': 'Archivieren',
    'email.star': 'Markieren',
    'email.unread': 'Ungelesen',
    'email.read': 'Gelesen',
    'email.subject': 'Betreff',
    'email.from': 'Von',
    'email.to': 'An',
    'email.cc': 'CC',
    'email.bcc': 'BCC',
    'email.priority': 'Priorität',
    'email.attachment': 'Anhang',
    'email.noEmails': 'Keine E-Mails gefunden',
    'email.selectEmail': 'E-Mail auswählen',
    'email.accounts': 'Konten',
    'email.folders': 'Ordner',
    'email.settings': 'E-Mail-Einstellungen',
    'email.sync': 'Synchronisieren',
    'email.assistant': 'KI E-Mail-Assistent',
    'email.automation': 'Automatisierungs-Hub',
    
    // File uploads
    'file.upload': 'Datei hochladen',
    'file.choose': 'Datei auswählen',
    'file.dragDrop': 'oder hier hineinziehen',
    'file.processing': 'Datei wird verarbeitet...',
    'file.error': 'Datei-Upload-Fehler',
    'file.success': 'Datei erfolgreich hochgeladen',
    
    // Common phrases
    'common.all': 'Alle',
    'common.none': 'Keine',
    'common.yes': 'Ja',
    'common.no': 'Nein',
    'common.or': 'oder',
    'common.and': 'und',
    'common.of': 'von',
    'common.in': 'in',
    'common.on': 'am',
    'common.at': 'um',
    'common.by': 'von',
    'common.from': 'von',
    'common.to': 'zu',
    'common.with': 'mit',
    'common.without': 'ohne',
    'common.today': 'Heute',
    'common.yesterday': 'Gestern',
    'common.tomorrow': 'Morgen',
    'common.week': 'Woche',
    'common.month': 'Monat',
    'common.year': 'Jahr',
    'common.date': 'Datum',    'common.time': 'Zeit',
    'common.language': 'Sprache',
    'common.currency': 'Währung',
    'common.timezone': 'Zeitzone',
    
    // Blog
    'blog.create': 'Beitrag erstellen',
    'blog.edit': 'Beitrag bearbeiten',
    'blog.manage_content': 'Verwalten Sie Ihre Blog-Inhalte',
    'blog.search_posts': 'Beiträge suchen...',
    'blog.no_excerpt': 'Kein Auszug',
    'blog.no_image': 'Kein Bild',
    'blog.post': 'Beitrag',
    'blog.publish': 'Veröffentlichen',
    'blog.unpublish': 'Unveröffentlichen',
    'blog.no_posts_found': 'Keine Beiträge gefunden, die Ihren Kriterien entsprechen.',
    'blog.create_first_post': 'Erstellen Sie Ihren ersten Beitrag',
    
    // Table
    'table.actions': 'Aktionen',
      // Filters
    'filter.all_statuses': 'Alle Status',
      // Clients
    'clients.add': 'Kunde hinzufügen',
    'clients.search': 'Kunden suchen...',
    'clients.import_logs': 'Import-Protokolle',
    'clients.more_filters': 'Weitere Filter',
    'clients.no_phone': 'Keine Telefonnummer',
    'clients.since': 'Kunde seit',
    
    // Pagination
    'pagination.showing': 'Zeige',
    'pagination.of': 'von',
    'pagination.results': 'Ergebnisse',
    
    // Modal
    'modal.confirm_deletion': 'Löschung bestätigen',
    'modal.delete_post_warning': 'Sind Sie sicher, dass Sie diesen Beitrag löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
    
    // Messages
    'message.error.failed_to_update_post_status': 'Fehler beim Aktualisieren des Beitragsstatus. Bitte versuchen Sie es erneut.',
    
    // Location/Contact
    'contact.streetParking': 'Straßenparkplätze verfügbar'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Try to get language from localStorage, default to 'de'
    const savedLang = localStorage.getItem('language');
    return (savedLang === 'en' || savedLang === 'de') ? savedLang : 'de';
  });

  useEffect(() => {
    // Save language preference to localStorage
    localStorage.setItem('language', language);
    // Update HTML lang attribute
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
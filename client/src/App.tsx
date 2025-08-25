import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { NeonAuthProvider } from './context/NeonAuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';
import HomePage from './pages/HomePage';
import FotoshootingsPage from './pages/FotoshootingsPage';
import GutscheinPage from './pages/GutscheinPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import WartelistePage from './pages/WartelistePage';
import KontaktPage from './pages/KontaktPage';
import VouchersPage from './pages/VouchersPage';
import VoucherDetailPage from './pages/VoucherDetailPage';
import VoucherCheckoutPage from './pages/VoucherCheckoutPage';
import VoucherSuccessPage from './pages/VoucherSuccessPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderCompletePage from './pages/OrderCompletePage';
import AccountPage from './pages/AccountPage';
import AccountProfilePage from './pages/AccountProfilePage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminDashboardPageDev from './pages/admin/AdminDashboardPageDev';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import NeonAdminLoginPage from './pages/admin/NeonAdminLoginPage';
import AdminLeadsPage from './pages/admin/AdminLeadsPage';
import AdminVoucherSalesPageV3 from './pages/admin/AdminVoucherSalesPageV3';
import AdminClientsPage from './pages/admin/ClientsPage';
import ClientDetailPage from './pages/admin/ClientDetailPage';
import ClientProfilePage from './pages/admin/ClientProfilePage';
import ClientFormPage from './pages/admin/ClientFormPage';
import AdminClientsImportPage from './pages/admin/ClientsImportPage';
import ImportLogsPage from './pages/admin/ImportLogsPage';
import HighValueClientsPage from './pages/admin/HighValueClientsPage';
import GalleriesPage from './pages/admin/GalleriesPage';
import AdminGalleriesPage from './pages/admin/AdminGalleriesPage';
import CalendarPage from './pages/admin/CalendarPage';
import AdminGalleryCreatePage from './pages/admin/GalleryCreatePage';
import AdminGalleryEditPage from './pages/admin/GalleryEditPage';
import AdminGalleryDetailPage from './pages/admin/GalleryDetailPage';
import InvoicesPage from './pages/admin/InvoicesPage';
import FilesPage from './pages/admin/FilesPage';
import ProDigitalFilesPage from './pages/admin/ProDigitalFilesPage';
import CampaignsPage from './pages/admin/CampaignsPage';
import AdminInboxPageV2 from './pages/admin/AdminInboxPageV2';
import QuestionnairesPageV2 from './pages/admin/QuestionnairesPageV2';
import ComprehensiveReportsPage from './pages/admin/ComprehensiveReportsPage';
import CustomizationPage from './pages/admin/CustomizationPage';
import StudioCustomization from './pages/admin/StudioCustomization';
import WebsiteCustomizationWizard from './pages/admin/WebsiteCustomizationWizard';
import PhotographyCalendarPage from './pages/admin/PhotographyCalendarPageSimple';
import SurveySystemDemoPage from './pages/SurveySystemDemoPage';
import SurveyTakingPage from './pages/SurveyTakingPage';
import AdminBlogPostsPage from './pages/admin/AdminBlogPostsPage';
import AdminBlogNewPage from './pages/admin/AdminBlogNewPage';
import AdminBlogEditPage from './pages/admin/AdminBlogEditPage';
import KnowledgeBasePage from './pages/admin/KnowledgeBasePage';
import CRMOperationsAssistant from './pages/admin/CRMOperationsAssistant';
import AdminAutoBlogPage from './pages/admin/AdminAutoBlogPage';
import AutoBlogGenerator from './pages/admin/AutoBlogGenerator';
import AutoBlogGeneratorFixed from './pages/admin/AutoBlogGeneratorFixed';
import TestPage from './pages/admin/TestPage';
import WebsiteWizard from './pages/admin/WebsiteWizard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import NeonProtectedRoute from './components/auth/NeonProtectedRoute';
import CartPage from './pages/CartPage';
import FamilyGutscheinPage from './pages/gutschein/FamilyGutscheinPage';
import NewbornGutscheinPage from './pages/gutschein/NewbornGutscheinPage';
import MaternityGutscheinPage from './pages/gutschein/MaternityGutscheinPage';
import BusinessFotoshootingPage from './pages/fotoshootings/BusinessFotoshootingPage';
import EventFotoshootingPage from './pages/fotoshootings/EventFotoshootingPage';
import WeddingFotoshootingPage from './pages/fotoshootings/WeddingFotoshootingPage';
import GalleryPage from './pages/GalleryPage';
import PublicGalleriesPage from './pages/PublicGalleriesPage';
import ChatBot from './components/chat/ChatBot';
import { GalleryShopTest } from './pages/GalleryShopTest';
import DownloadDataPage from './pages/DownloadDataPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NeonAuthProvider>
          <AppProvider>
            <CartProvider>
              <LanguageProvider>
              <Router>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/fotoshootings" element={<FotoshootingsPage />} />
                <Route path="/fotoshootings/business" element={<BusinessFotoshootingPage />} />
                <Route path="/fotoshootings/event" element={<EventFotoshootingPage />} />
                <Route path="/fotoshootings/wedding" element={<WeddingFotoshootingPage />} />
                <Route path="/gutschein" element={<GutscheinPage />} />
                <Route path="/gutschein/family" element={<FamilyGutscheinPage />} />
                <Route path="/gutschein/newborn" element={<NewbornGutscheinPage />} />
                <Route path="/gutschein/maternity" element={<MaternityGutscheinPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="/warteliste" element={<WartelistePage />} />
                <Route path="/kontakt" element={<KontaktPage />} />
                <Route path="/vouchers" element={<VouchersPage />} />
                <Route path="/voucher/:slug" element={<VoucherDetailPage />} />
                <Route path="/vouchers/checkout/:id" element={<VoucherCheckoutPage />} />
                <Route path="/vouchers/success" element={<VoucherSuccessPage />} />
                <Route path="/checkout/:id" element={<CheckoutPage />} />
                <Route path="/order-complete/:id" element={<OrderCompletePage />} />                <Route path="/account" element={<AccountPage />} />
                <Route path="/account/profile" element={<AccountProfilePage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/galleries" element={<PublicGalleriesPage />} />
                <Route path="/galerie" element={<PublicGalleriesPage />} />
                <Route path="/gallery/:slug" element={<GalleryPage />} />
                <Route path="/gallery" element={<ProtectedRoute><GalleryPage /></ProtectedRoute>} />
                <Route path="/survey-demo" element={<SurveySystemDemoPage />} />
                <Route path="/survey/:id" element={<SurveyTakingPage />} />
                <Route path="/download-data" element={<DownloadDataPage />} />
                
                {/* Admin routes */}
                <Route path="/admin/login" element={<NeonAdminLoginPage />} />
                <Route path="/admin/supabase-login" element={<AdminLoginPage />} />
                <Route path="/admin/dev" element={<AdminDashboardPageDev />} />
                <Route 
                  path="/admin" 
                  element={
                    <NeonProtectedRoute>
                      <AdminDashboardPage />
                    </NeonProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/dashboard" 
                  element={
                    <NeonProtectedRoute>
                      <AdminDashboardPage />
                    </NeonProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/leads" 
                  element={
                    <ProtectedRoute>
                      <AdminLeadsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/voucher-sales" 
                  element={
                    <ProtectedRoute>
                      <AdminVoucherSalesPageV3 />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/clients" 
                  element={
                    <ProtectedRoute>
                      <AdminClientsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route
                  path="/admin/clients/new"
                  element={
                    <ProtectedRoute>
                      <ClientFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/:id"
                  element={
                    <ProtectedRoute>
                      <ClientDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/:id/edit"
                  element={
                    <ProtectedRoute>
                      <ClientFormPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/import"
                  element={
                    <ProtectedRoute>
                      <AdminClientsImportPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/clients/import-logs"
                  element={
                    <ProtectedRoute>
                      <ImportLogsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/high-value-clients"
                  element={
                    <ProtectedRoute>
                      <HighValueClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/galleries"
                  element={
                    <ProtectedRoute>
                      <GalleriesPage />
                    </ProtectedRoute>
                  }
                />
                <Route 
                  path="/admin/galleries/new" 
                  element={
                    <ProtectedRoute>
                      <AdminGalleryCreatePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/galleries/:id/edit" 
                  element={
                    <ProtectedRoute>
                      <AdminGalleryEditPage />
                    </ProtectedRoute>
                  } 
                />

                <Route 
                  path="/admin/calendar" 
                  element={
                    <ProtectedRoute>
                      <CalendarPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/invoices" 
                  element={
                    <ProtectedRoute>
                      <InvoicesPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/files" 
                  element={
                    <ProtectedRoute>
                      <FilesPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/pro-files" 
                  element={
                    <ProtectedRoute>
                      <ProDigitalFilesPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/campaigns" 
                  element={
                    <ProtectedRoute>
                      <CampaignsPage />
                    </ProtectedRoute>
                  } 
                />                <Route 
                  path="/admin/inbox" 
                  element={
                    <ProtectedRoute>
                      <AdminInboxPageV2 />
                    </ProtectedRoute>
                  } 
                />                <Route 
                  path="/admin/questionnaires" 
                  element={
                    <ProtectedRoute>
                      <QuestionnairesPageV2 />
                    </ProtectedRoute>
                  } 
                /><Route 
                  path="/admin/reports" 
                  element={
                    <ProtectedRoute>
                      <ComprehensiveReportsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/crm-assistant" 
                  element={
                    <ProtectedRoute>
                      <CRMOperationsAssistant />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/knowledge-base" 
                  element={
                    <ProtectedRoute>
                      <KnowledgeBasePage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/test" 
                  element={
                    <ProtectedRoute>
                      <TestPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/customization" 
                  element={
                    <ProtectedRoute>
                      <CustomizationPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/studio-templates" 
                  element={
                    <ProtectedRoute>
                      <StudioCustomization />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/website-wizard" 
                  element={
                    <ProtectedRoute>
                      <WebsiteCustomizationWizard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/website-analyzer" 
                  element={
                    <ProtectedRoute>
                      <WebsiteWizard />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/" 
                  element={<HomePage />} 
                />
                <Route 
                  path="/home" 
                  element={<HomePage />} 
                />
                <Route 
                  path="/admin/calendar" 
                  element={
                    <ProtectedRoute>
                      <PhotographyCalendarPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/blog" 
                  element={
                    <ProtectedRoute>
                      <AdminBlogPostsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/blog/posts" 
                  element={
                    <ProtectedRoute>
                      <AdminBlogPostsPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/blog/new" 
                  element={
                    <ProtectedRoute>
                      <AdminBlogNewPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/blog/edit/:id" 
                  element={
                    <ProtectedRoute>
                      <AdminBlogEditPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/autoblog" 
                  element={
                    <ProtectedRoute>
                      <AutoBlogGenerator />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/autoblog-generator" 
                  element={
                    <ProtectedRoute>
                      <AutoBlogGenerator />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/autoblog-generator-fixed" 
                  element={
                    <ProtectedRoute>
                      <AutoBlogGeneratorFixed />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/autoblog-v3" 
                  element={
                    <ProtectedRoute>
                      <AutoBlogGeneratorFixed />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/autoblog-v4" 
                  element={
                    <ProtectedRoute>
                      <AutoBlogGeneratorFixed />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin/clients/new" 
                  element={
                    <ProtectedRoute>
                      <ClientFormPage />
                    </ProtectedRoute>
                  } 
                />
                <Route path="/gallery-shop-test" element={<GalleryShopTest />} />
              </Routes>
              <ChatBot />
            </Router>
              </LanguageProvider>
            </CartProvider>
          </AppProvider>
        </NeonAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
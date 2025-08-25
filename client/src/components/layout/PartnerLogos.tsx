import React from 'react';

const PartnerLogos: React.FC = () => {
  const partners = [
    { url: "https://i.postimg.cc/bJGQXcx9/1626165386655.jpg", alt: "Partner logo" },
    { url: "https://i.postimg.cc/xT9cMVXp/217447.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/hPRVYYfV/bank-austria-edvfiasko-kostet-bank-austria20121107201134.jpg", alt: "Bank Austria" },
    { url: "https://i.postimg.cc/26PnrcTR/cropped-logo-web-text1.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/2jhZnx2y/download.jpg", alt: "Partner logo" },
    { url: "https://i.postimg.cc/MHVVT7rc/download-1.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/SNLcbGM3/download-2.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/sfhpwzDV/download-2.jpg", alt: "Partner logo" },
    { url: "https://i.postimg.cc/Qd05HxSq/download-3.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/s2xWSdNC/download-4.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/3xKm8DjR/download-4.jpg", alt: "Partner logo" },
    { url: "https://i.postimg.cc/Gpfyx7W8/download-5.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/rmttnGTh/download-6.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/mkf10c2T/download-7.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/1XGVP9fw/download-8.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/ZKLvM5kh/erste.jpg", alt: "Erste Bank" },
    { url: "https://i.postimg.cc/wTzs2sGV/Eurovision.jpg", alt: "Eurovision" },
    { url: "https://i.postimg.cc/jSdn0YKn/Google-Trusted-Photographer-Badge.jpg", alt: "Google Trusted Photographer" },
    { url: "https://i.postimg.cc/DzSW0QS2/IGEPHA-Logo-transparent.png", alt: "IGEPHA" },
    { url: "https://i.postimg.cc/g01xZwh3/images.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/Jz6DRY46/images-3.jpg", alt: "Partner logo" },
    { url: "https://i.postimg.cc/wvJ7c65Z/kieninger-lagler-gmbh-full-1510837544.jpg", alt: "Kieninger Lagler" },
    { url: "https://i.postimg.cc/xTgqPpHf/kl-herzen-logo4c-ohnetext.jpg", alt: "KL Herzen" },
    { url: "https://i.postimg.cc/gjWrgfNJ/logo-300x141.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/SRfR3DvG/Porr-svg.png", alt: "Porr" },
    { url: "https://i.postimg.cc/PfWCC558/RB4PRNY.jpg", alt: "Partner logo" },
    // New partner logos
    { url: "https://i.postimg.cc/Hx2RcMcL/images.jpg", alt: "Partner logo" },
    { url: "https://i.postimg.cc/BbnyxvHB/images.png", alt: "Partner logo" },
    { url: "https://i.postimg.cc/rwrHG303/Leier-International-logo-svg.png", alt: "Leier International" },
    { url: "https://i.postimg.cc/PrccwTx1/Logo-BB-svg.png", alt: "BB Logo" },
    { url: "https://i.postimg.cc/vT2KXdvF/mydays-logo-png-seeklogo-357684.png", alt: "MyDays" },
    { url: "https://i.postimg.cc/66MFBdxj/QAP.png", alt: "QAP" },
    { url: "https://i.postimg.cc/QxVwCHXX/RIH-logo-90-90-90-300x152.jpg", alt: "RIH" },
    { url: "https://i.postimg.cc/FKXBTp0R/stekovics-tomaten-chili.jpg", alt: "Stekovics" }
  ];

  return (
    <section className="bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
          Our Partners
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {partners.map((partner, index) => (
            <div 
              key={index} 
              className="bg-white rounded-lg p-4 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
            >
              <img
                src={partner.url}
                alt={partner.alt}
                className="max-h-16 w-auto object-contain transition-transform hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerLogos;
import React from 'react';

interface InvoiceTemplateProps {
  invoice: {
    id: string;
    invoice_number: string;
    client_id: string;
    amount: number;
    tax_amount: number;
    total_amount: number;
    subtotal_amount: number;
    discount_amount: number;
    currency: string;
    status: string;
    due_date: string;
    payment_terms: string;
    notes?: string;
    created_at: string;
    client?: {
      name: string;
      email: string;
      address1?: string;
      city?: string;
      country?: string;
    };
    items?: Array<{
      description: string;
      quantity: number;
      unit_price: number;
      tax_rate: number;
      line_total: number;
    }>;
  };
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  return (
    <div className="invoice-template" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      color: '#333',
      backgroundColor: '#fff',
      boxShadow: '0 0 10px rgba(0,0,0,0.1)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '40px',
        borderBottom: '2px solid #333',
        paddingBottom: '20px'
      }}>
        {/* Logo and Company Info */}
        <div style={{ flex: 1 }}>
          <img 
            src="https://i.postimg.cc/ncJ85X8v/frontend-logo.jpg" 
            alt="New Age Fotografie Logo" 
            style={{ 
              maxHeight: '80px', 
              marginBottom: '20px',
              objectFit: 'contain'
            }} 
          />
          <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#666' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              NEW AGE FOTOGRAFIE
            </div>
            <div>Office and Correspondence Address:</div>
            <div>Julius Tandler Platz 5 / 13, 1090 Wien, Austria</div>
            <div>Entrance corner Schönbrunnerstraße</div>
            <div style={{ marginTop: '5px' }}>
              Studio: Wehrgasse 11A/2+5, 1050 Wien
            </div>
            <div style={{ marginTop: '5px' }}>
              hallo@newagefotografie.com
            </div>
          </div>
        </div>

        {/* Invoice Title and Number */}
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            margin: '0',
            letterSpacing: '2px'
          }}>
            INVOICE
          </h1>
          <div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
            <div>No. {invoice.invoice_number}</div>
            <div>Date: {formatDate(invoice.created_at)}</div>
            <div>Due Date: {formatDate(invoice.due_date)}</div>
          </div>
        </div>
      </div>

      {/* Client Information */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          INVOICE TO:
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
          <div style={{ fontWeight: 'bold' }}>{invoice.client?.name}</div>
          <div>{invoice.client?.email}</div>
          {invoice.client?.address1 && <div>{invoice.client.address1}</div>}
          {invoice.client?.city && invoice.client?.country && (
            <div>{invoice.client.city}, {invoice.client.country}</div>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '30px' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '14px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#333', color: 'white' }}>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                QTY
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'left',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                ITEM DESCRIPTION
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'right',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                PRICE
              </th>
              <th style={{ 
                padding: '12px', 
                textAlign: 'right',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index} style={{ 
                borderBottom: '1px solid #eee',
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white'
              }}>
                <td style={{ padding: '12px' }}>{item.quantity}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                    {item.description}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Professional photography service with post-processing
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {formatCurrency(item.unit_price, invoice.currency)}
                </td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  {formatCurrency(item.line_total, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        marginBottom: '30px'
      }}>
        <div style={{ minWidth: '250px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '8px 0',
            fontSize: '14px'
          }}>
            <span>Sub-Total:</span>
            <span>{formatCurrency(invoice.subtotal_amount, invoice.currency)}</span>
          </div>
          
          {invoice.discount_amount > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '8px 0',
              fontSize: '14px'
            }}>
              <span>Discount (5%):</span>
              <span>-{formatCurrency(invoice.discount_amount, invoice.currency)}</span>
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '8px 0',
            fontSize: '14px'
          }}>
            <span>Tax Vat (19%):</span>
            <span>{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '12px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            backgroundColor: '#333',
            color: 'white',
            marginTop: '10px',
            paddingLeft: '12px',
            paddingRight: '12px'
          }}>
            <span>Grand Total:</span>
            <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          PAYMENT METHOD:
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
          <div>Bank Transfer</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Payment Terms: {invoice.payment_terms}
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          TERMS & CONDITIONS:
        </div>
        <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#666' }}>
          Invoice is payable within {invoice.payment_terms} from invoice date. Late payment may result in suspension of services and additional charges.
          All images remain the property of New Age Fotografie until payment is received in full.
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center',
        borderTop: '1px solid #eee',
        paddingTop: '20px',
        fontSize: '14px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
          Thank You For Your Business !
        </div>
        <div style={{ fontSize: '12px', color: '#666' }}>
          NEW AGE FOTOGRAFIE - VIENNA SPECIALISTS
        </div>
      </div>

      {/* Watermark */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        fontSize: '10px',
        color: '#ccc',
        transform: 'rotate(-45deg)',
        transformOrigin: 'center'
      }}>
        IMAGES NOT INCLUDED
      </div>
    </div>
  );
};

export default InvoiceTemplate;
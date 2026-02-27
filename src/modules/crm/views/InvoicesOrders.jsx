import React, { useState } from 'react';
import { Receipt, ShoppingCart, Download, ExternalLink, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function InvoicesOrders() {
  const [activeTab, setActiveTab] = useState('INVOICES');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Ventas y Facturación</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Control de comprobantes fiscales y órdenes de compra recibidas.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border px-5 py-3 rounded-2xl font-bold text-sm shadow-sm hover:border-gray-300 transition-all">
            <Download className="h-4 w-4 text-primary" /> Reporte SAT
          </button>
        </div>
      </div>

      <div className="flex border-b gap-8 px-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'INVOICES', label: 'Facturas Emitidas', icon: Receipt },
          { id: 'ORDERS', label: 'Órdenes de Compra (OC)', icon: ShoppingCart }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 py-4 border-b-2 font-black text-sm transition-all whitespace-nowrap uppercase tracking-wider",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar folio o cliente..." className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-64" />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-white border-b">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">Folio / Fecha</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Monto</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Documentos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[
              { id: 'F-9023', date: '25 Feb 2026', client: 'Minera del Potosí', total: 145000, status: 'PAGADA' },
              { id: 'F-9024', date: '26 Feb 2026', client: 'Bebidas Globales', total: 52200, status: 'PENDIENTE' },
            ].map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-black text-sm text-gray-900">{item.id}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{item.date}</p>
                </td>
                <td className="px-6 py-4 font-bold text-gray-700 text-sm">{item.client}</td>
                <td className="px-6 py-4 font-black text-sm text-gray-900">${item.total.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider",
                    item.status === 'PAGADA' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>{item.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:text-primary transition-colors border rounded-lg">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors border rounded-lg">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

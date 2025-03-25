import React from 'react';
import { format } from 'date-fns';
import { Transaction } from '../types';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Transaction History</h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {transaction.type === 'deposit' ? (
                        <ArrowUpCircle className="h-5 w-5 text-green-500 mr-2" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5 text-red-500 mr-2" />
                      )}
                      <span className="capitalize">{transaction.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
                      ${transaction.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${transaction.status === 'success' ? 'bg-green-100 text-green-800' : 
                        transaction.status === 'failed' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
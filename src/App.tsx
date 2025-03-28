import React, { useState, useEffect } from 'react';
import { AlertTriangle, FileCheck, Search, Wallet } from 'lucide-react';
import { useAccount, useConnect, useDisconnect, useWriteContract, useReadContract, useWatchContractEvent, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseAbiItem, encodeAbiParameters, parseAbiParameters } from 'viem';
import { DOUBLE_FINANCING_ALERT_ABI } from './contracts/DoubleFinancingAlert';

const CONTRACT_ADDRESS = '0x72e313B60a40E84336Fba9Fb6b7aDDE2aFD958eD';

interface MortgageEvent {
  propertyHash: `0x${string}`;
  financier: `0x${string}`;
  timestamp: number;
}

interface AlertEvent {
  propertyHash: `0x${string}`;
  primaryFinancier: `0x${string}`;
  newFinancier: `0x${string}`;
  timestamp: Date;
}

function App() {
  const [propertyDetails, setPropertyDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [registeredMortgages, setRegisteredMortgages] = useState<MortgageEvent[]>([]);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  const { writeContract, isPending, data: txHash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash,
    enabled: !!pendingTxHash,
  });

  // Watch for new events instead of loading past events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: DOUBLE_FINANCING_ALERT_ABI,
    eventName: 'MortgageRegistered',
    onLogs(logs) {
      const newMortgages = logs.map((log) => ({
        propertyHash: log.args.propertyHash!,
        financier: log.args.financier!,
        timestamp: Number(log.args.timestamp),
      }));
      setRegisteredMortgages((prev) => [...newMortgages, ...prev]);
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: DOUBLE_FINANCING_ALERT_ABI,
    eventName: 'AlertDoubleFinancing',
    onLogs(logs) {
      const newAlerts = logs.map((log) => ({
        propertyHash: log.args.propertyHash!,
        primaryFinancier: log.args.primaryFinancier!,
        newFinancier: log.args.newFinancier!,
        timestamp: new Date(),
      }));
      setAlerts((prev) => [...newAlerts, ...prev]);
      
      // Show error message for double financing attempt
      if (newAlerts.length > 0) {
        setError('Double financing attempt detected! This property already has a registered mortgage.');
        setLoading(false);
      }
    },
  });

  // Update pending transaction hash when available
  useEffect(() => {
    if (txHash) {
      setPendingTxHash(txHash);
      setSuccess('Transaction submitted to network. Waiting for confirmation...');
    }
  }, [txHash]);

  // Clear pending transaction when confirmed
  useEffect(() => {
    if (isConfirmed) {
      setPendingTxHash(null);
      setSuccess('Transaction confirmed! Mortgage registration complete.');
      setLoading(false);
    }
  }, [isConfirmed]);

  // Convert string to bytes32
  const stringToBytes32 = (str: string): `0x${string}` => {
    // Encode the string as bytes
    const encoded = encodeAbiParameters(
      parseAbiParameters(['string']),
      [str]
    );
    // Pad or truncate to 32 bytes
    return encoded.slice(0, 66) as `0x${string}`;
  };

  const { data: isMortgaged } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: DOUBLE_FINANCING_ALERT_ABI,
    functionName: 'checkMortgage',
    args: [propertyDetails ? stringToBytes32(propertyDetails) : '0x0000000000000000000000000000000000000000000000000000000000000000'],
    enabled: !!propertyDetails,
  });

  const handleRegisterMortgage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    if (isPending || isConfirming) {
      setError('A transaction is already in progress');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const propertyHash = stringToBytes32(propertyDetails);
      
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: DOUBLE_FINANCING_ALERT_ABI,
        functionName: 'registerMortgage',
        args: [propertyHash],
      });
      
    } catch (err) {
      setError('Failed to register mortgage. Please try again.');
      console.error(err);
      setLoading(false);
    }
  };

  const handleCheckMortgage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const propertyHash = stringToBytes32(propertyDetails);
      const result = await isMortgaged;
      
      setSuccess(`Property check completed. Mortgage ${result ? 'exists' : 'does not exist'}.`);
    } catch (err) {
      setError('Failed to check mortgage. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionStatus = () => {
    if (isPending) return 'Waiting for wallet approval...';
    if (isConfirming) return 'Transaction submitted, waiting for confirmation...';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-indigo-900">
              Double Financing Alert System
            </h1>
            <button
              onClick={() => isConnected ? disconnect() : connect({ connector: injected() })}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <Wallet className="w-5 h-5" />
              {isConnected ? 'Disconnect' : 'Connect Wallet'}
            </button>
          </div>

          {isConnected && (
            <div className="bg-indigo-50 p-4 rounded-md mb-8">
              <p className="text-sm text-indigo-700">Connected: {address}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
            <form onSubmit={handleRegisterMortgage} className="space-y-4">
              <div>
                <label htmlFor="propertyDetails" className="block text-sm font-medium text-gray-700 mb-1">
                  Property Details
                </label>
                <textarea
                  id="propertyDetails"
                  value={propertyDetails}
                  onChange={(e) => setPropertyDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4}
                  placeholder="Enter property details (address, registration number, etc.)"
                  required
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading || isPending || isConfirming || !isConnected}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-5 h-5" />
                  Register Mortgage
                </button>

                <button
                  type="button"
                  onClick={handleCheckMortgage}
                  disabled={loading || !isConnected}
                  className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  Check Property
                </button>
              </div>
            </form>

            {(isPending || isConfirming) && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2 text-blue-700">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-700"></div>
                <span>{getTransactionStatus()}</span>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                {error}
              </div>
            )}

            {success && !isPending && !isConfirming && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
                <FileCheck className="w-5 h-5" />
                {success}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Recent Mortgages */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Recent Mortgages</h2>
              <div className="space-y-4">
                {registeredMortgages.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No mortgages registered yet</p>
                ) : (
                  registeredMortgages.map((mortgage, index) => (
                    <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-center gap-2 text-blue-700 font-medium">
                        <FileCheck className="w-5 h-5" />
                        New Mortgage Registered
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        Property hash: {mortgage.propertyHash}
                      </p>
                      <p className="text-sm text-gray-600">
                        Financier: {mortgage.financier}
                      </p>
                      <p className="text-sm text-gray-600">
                        Time: {new Date(mortgage.timestamp * 1000).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Double Financing Alerts */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900">Double Financing Alerts</h2>
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No alerts detected</p>
                ) : (
                  alerts.map((alert, index) => (
                    <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center gap-2 text-yellow-700 font-medium">
                        <AlertTriangle className="w-5 h-5" />
                        Double Financing Attempt Detected
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        Property hash: {alert.propertyHash}
                      </p>
                      <p className="text-sm text-gray-600">
                        Primary Financier: {alert.primaryFinancier}
                      </p>
                      <p className="text-sm text-gray-600">
                        New Financier: {alert.newFinancier}
                      </p>
                      <p className="text-sm text-gray-600">
                        Time: {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
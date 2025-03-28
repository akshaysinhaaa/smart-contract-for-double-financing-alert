export const DOUBLE_FINANCING_ALERT_ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "propertyHash",
				"type": "bytes32"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "primaryFinancier",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newFinancier",
				"type": "address"
			}
		],
		"name": "AlertDoubleFinancing",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "propertyHash",
				"type": "bytes32"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "financier",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "MortgageRegistered",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "_propertyDetails",
				"type": "bytes32"
			}
		],
		"name": "checkMortgage",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "_propertyDetails",
				"type": "bytes32"
			}
		],
		"name": "registerMortgage",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}
]
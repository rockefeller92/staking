import { FC, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Svg } from 'react-optimized-image';

import MintTab from './components/MintTab';
import BurnTab from './components/BurnTab';

import StructuredTab from 'components/StructuredTab';
import { LoadingState } from 'constants/loading';
import Burn from 'assets/svg/app/burn.svg';
import Mint from 'assets/svg/app/mint.svg';
import { StakingPanelType } from 'pages/staking';
import { getGasEstimateForTransaction } from 'utils/transactions';
import synthetix from 'lib/synthetix';
import { SynthetixJS } from '@synthetixio/js';
import useEthGasPriceQueryQuery from 'queries/network/useEthGasPriceQuery';
import { getMintAmount } from './components/helper';
import { CRYPTO_CURRENCY_MAP, SYNTHS_MAP } from 'constants/currency';
import { walletAddressState } from 'store/wallet';
import { useRecoilValue } from 'recoil';
import { normalizedGasPrice } from 'utils/network';
import TxConfirmationModal from 'sections/shared/modals/TxConfirmationModal';

interface MintBurnBoxProps {
	targetCRatio: number;
	maxCollateral: number;
	maxBurnAmount: number;
	snxPrice: number;
	amountToBurn: string;
	amountToStake: string;
	setAmountToStake: (amount: string) => void;
	setAmountToBurn: (amount: string) => void;
	setPanelType: (type: StakingPanelType) => void;
	stakedSNX: number;
}

const MintBurnBox: FC<MintBurnBoxProps> = ({
	targetCRatio,
	maxCollateral,
	maxBurnAmount,
	snxPrice,
	amountToBurn,
	amountToStake,
	setAmountToBurn,
	setAmountToStake,
	setPanelType,
	stakedSNX,
}) => {
	const { t } = useTranslation();
	const [mintLoadingState] = useState<LoadingState | null>(null);
	const [burnLoadingState] = useState<LoadingState | null>(null);
	const [stakingTxModalOpen, setStakingTxModalOpen] = useState<boolean>(false);
	const [burningTxModalOpen, setBurningTxModalOpen] = useState<boolean>(false);
	const ethGasPriceQuery = useEthGasPriceQueryQuery();
	const gasPrice = ethGasPriceQuery?.data?.average ?? 0;
	const walletAddress = useRecoilValue(walletAddressState);
	const [stakingTxError, setStakingTxError] = useState<boolean>(false);
	const [burningTxError, setBurningTxError] = useState<boolean>(false);
	const [stakingCurrencyKey] = useState<string>(CRYPTO_CURRENCY_MAP.SNX);
	const [synthCurrencyKey] = useState<string>(SYNTHS_MAP.sUSD);

	// TODO: useMemo
	// eslint-disable-next-line
	const handleStake = async () => {
		try {
			setStakingTxError(false);
			setStakingTxModalOpen(true);
			const {
				contracts: { Synthetix },
				utils: { parseEther },
			} = synthetix.js as SynthetixJS;
			let transaction;
			if (Number(amountToStake) === maxCollateral) {
				const gasLimit = getGasEstimateForTransaction([], Synthetix.estimateGas.issueMaxSynths);
				transaction = await Synthetix.issueMaxSynths({
					gasPrice: normalizedGasPrice(gasPrice),
					gasLimit,
				});
			} else {
				const gasLimit = getGasEstimateForTransaction(
					[parseEther(amountToStake)],
					Synthetix.estimateGas.issueSynths
				);
				console.log(gasLimit);
				const mintAmount = getMintAmount(targetCRatio, amountToStake, snxPrice);
				transaction = await Synthetix.issueSynths(parseEther(mintAmount.toString()), {
					gasPrice: normalizedGasPrice(gasPrice),
					gasLimit,
				});
			}
			if (transaction) {
				//TODO: BN NOTIFY
			}
		} catch (e) {
			setStakingTxError(true);
		}
	};

	// TODO: useMemo
	// eslint-disable-next-line
	const handleBurn = async () => {
		try {
			setBurningTxError(false);
			setBurningTxModalOpen(true);
			//TODO: Change this
			const burnToTarget = false;
			const {
				contracts: { Synthetix, Issuer },
				utils: { formatBytes32String, parseEther },
			} = synthetix.js as SynthetixJS;

			if (await Synthetix.isWaitingPeriod(formatBytes32String(SYNTHS_MAP.sUSD)))
				throw new Error('Waiting period for sUSD is still ongoing');
			if (!burnToTarget && !(await Issuer.canBurnSynths(walletAddress)))
				throw new Error('Waiting period to burn is still ongoing');
			let transaction;
			if (burnToTarget) {
				const gasLimit = getGasEstimateForTransaction([], Synthetix.estimateGas.burnSynthsToTarget);
				transaction = await Synthetix.burnSynthsToTarget({
					gasPrice: normalizedGasPrice(gasPrice),
					gasLimit: gasLimit,
				});
			} else {
				const gasLimit = getGasEstimateForTransaction(
					[parseEther(amountToBurn.toString())],
					Synthetix.estimateGas.burnSynths
				);
				transaction = await Synthetix.burnSynths(amountToBurn, {
					gasPrice: normalizedGasPrice(gasPrice),
					gasLimit,
				});
			}
			if (transaction) {
				//TODO: BN NOTIFY
				setBurningTxModalOpen(false);
			}
		} catch (e) {
			setBurningTxError(true);
		}
	};

	const tabData = useMemo(
		() => [
			{
				title: t('staking.actions.mint.title'),
				icon: () => <Svg src={Mint} />,
				tabChildren: (
					<MintTab
						amountToStake={amountToStake}
						setAmountToStake={setAmountToStake}
						targetCRatio={targetCRatio}
						maxCollateral={maxCollateral}
						mintLoadingState={mintLoadingState}
						snxPrice={snxPrice}
						handleStake={handleStake}
					/>
				),
			},
			{
				title: t('staking.actions.burn.title'),
				icon: () => <Svg src={Burn} />,
				tabChildren: (
					<BurnTab
						amountToBurn={amountToBurn}
						setAmountToBurn={setAmountToBurn}
						burnLoadingState={burnLoadingState}
						targetCRatio={targetCRatio}
						maxBurnAmount={maxBurnAmount}
						snxPrice={snxPrice}
						stakedSNX={stakedSNX}
						handleBurn={handleBurn}
					/>
				),
			},
		],
		[
			amountToStake,
			amountToBurn,
			maxBurnAmount,
			maxCollateral,
			setAmountToBurn,
			setAmountToStake,
			snxPrice,
			stakedSNX,
			t,
			targetCRatio,
			burnLoadingState,
			handleBurn,
			handleStake,
			mintLoadingState,
		]
	);
	return (
		<>
			<StructuredTab
				boxPadding={0}
				boxHeight={400}
				boxWidth={500}
				tabData={tabData}
				setPanelType={setPanelType}
			/>
			{stakingTxModalOpen && (
				<TxConfirmationModal
					onDismiss={() => setStakingTxModalOpen(false)}
					txError={stakingTxError}
					attemptRetry={handleStake}
					baseCurrencyAmount={amountToStake}
					quoteCurrencyAmount={getMintAmount(targetCRatio, amountToStake, snxPrice).toString()}
					baseCurrencyKey={stakingCurrencyKey!}
					quoteCurrencyKey={synthCurrencyKey!}
				/>
			)}
			{burningTxModalOpen && (
				<TxConfirmationModal
					onDismiss={() => setBurningTxModalOpen(false)}
					txError={burningTxError}
					attemptRetry={handleBurn}
					baseCurrencyAmount={amountToStake}
					quoteCurrencyAmount={getMintAmount(targetCRatio, amountToStake, snxPrice).toString()}
					baseCurrencyKey={stakingCurrencyKey!}
					quoteCurrencyKey={synthCurrencyKey!}
				/>
			)}
		</>
	);
};

export default MintBurnBox;
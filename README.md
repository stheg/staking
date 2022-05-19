# staking platform 

Hey! Here is a small guide how my implementation of staking contract works.

By default, a staking platform deployed in a locked state. It means it isn't possible to call stake, unstake, claim functions. Also, by default, staking and reward tokens are NOT initilized. 
So, before using the contract, you should specify the tokens using appropriate functions.
To unlock the contract, you can use 'setLock(false)' function.
Also, you can change internal parameters: unstake period, reward period, reward percentage - they don't require the lock state, so, you can change them at any time.
Now you are ready to use stake, unstake and claim functions!

Also, in the tests and tasks uniswap contracts are used to provide liquidity and get LP-token.

Steps to deploy & test [you can change 'localhost' to 'rinkeby' to perform all tasks in the rinkeby]:
0. compile the contract & uncomment [import tasks] in hardhat.config.ts
```
    0. 1. npx hardhat compile
    0. 2. // uncomment the next lines in hardhat.config.ts:
//UNCOMMENT AFTER COMPILATION:
//import "./tasks/staking";
//import "./tasks/task-helper";
``` 
1. use [deploy-token] task to deploy 2 MAERC20 tokens: A and B
```
    1. 1. npx hardhat deploy-token -n A -v 10000 --network localhost // => TOKEN_A_ADDR
    1. 2. npx hardhat deploy-token -n B -v 1000  --network localhost // => TOKEN_B_ADDR
```
2. use [provide-liquidity] task to get an LP-token for pair (A, B)
```
    2. 1. npx hardhat provide-liquidity --provider SIGNER_ADDR --tokenA TOKEN_A_ADDR --tokenB TOKEN_B_ADDR --network localhost // => LP_TOKEN_ADDR
```
3. deploy StakingPlatform => it will be locked by default (see 4 and 4.2 to unlock)
```
    3. 1. npx hardhat run .\scripts\deploy.ts --network localhost // => STAKING_PLATFORM_ADDR
```
4. use [set-token] to set the LP-token as staking token and i.e. B as reward token. !!! Use [--unlock] flag for the second task to unlock the platform
```
    4. 1. npx hardhat set-token --type staking --token LP_TOKEN_ADDR --contract STAKING_PLATFORM_ADDR --network localhost
    4. 2. npx hardhat set-token --type reward --token TOKEN_B_ADDR --contract STAKING_PLATFORM_ADDR --unlock --network localhost
```
5. Now we are ready to start working with the staking platform, but you can probably want to change some default settings like unstake period, reward period, reward percentage - they can be changed without locking the platform, but there are no tasks for them now. Do it somehow yourself:)
6. use [stake] task to stake some amount of LP_TOKENs. The task includes 'approve' function already.
```
    6. 1. npx hardhat stake --contract STAKING_PLATFORM --network localhost // => it will stake all tokens you have on the balance
    6. 2. npx hardhat stake --contract STAKING_PLATFORM --value 1000 --network localhost // => it will stake 1000 units
```
7. Wait 20 minutes (by default) to be able to use [unstake] task
```
    7. 1. npx hardhat unstake --contract STAKING_PLATFORM --network localhost // => it will transfer your staked tokens back to you
```
8. By default the reward period is 10 minutes, so now you should be able to use [claim] task. For now, for test local node, the task automatically mints some amount of TOKEN_B (it is the reward token, you rememeber, yes?:)) for the staking platform.
```
    8. 1. npx hardhat claim --contract STAKING_PLATFORM --network localhost
```
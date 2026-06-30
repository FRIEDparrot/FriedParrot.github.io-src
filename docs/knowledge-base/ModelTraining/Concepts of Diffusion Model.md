---
tags:
  - diffusion-model
  - peclet-number
---
## 1. Introduction  
**Diffusion model** is firstly introduced in  [^1], also [^2] gives a 3D u-net structure, which contains  diffusion model as a basic. 

The <b><mark style='background: transparent; color: orange'>central idea of diffusion model</mark></b> is **to systematically and slowly destroy structure** in a data distribution through an <b><mark style='background: transparent; color: orange'>iterative forward diffusion process</mark></b>. 

Then we use a <b><mark style='background: transparent; color: red'>reverse diffusion process that restores the structure in data</mark></b>. Yielding  **a highly flexible and tractable generative model of data**.  

> [!PDF|note] [[📃Essays/👨🏻‍🎓Deep Learning/🧺Basic Network Structures/Generative Networks/Deep Unsupervised Learning using Noneqilibrium Thermodynamics.pdf#page=1&selection=74,39,77,46&color=note|Deep Unsupervised Learning using Noneqilibrium Thermodynamics, p.1]]
> >  This approach allows us to rapidly learn, sample from, and evaluate probabilities in deep generative models with thousands of layers or time steps,

### (1) Limitation of Model   
Firstly, models are <b><mark style='background: transparent; color: orange'>suffering from a tradeoff between  tractability and flexibility</mark></b>. Models that are tractable can be analytically evaluated and easily fit to data (e.g. a Gaussian or Laplace, but the complexity of model can be  not good to tract the rich dataset (i.e., not flexible enough). 

We can **define models in terms of any non-negative function** $\phi(x)$, this yield 
$$
p(x) = \frac{\phi(x)}{Z} \tag{1.1.1}
$$
But the computation of $Z$ is intractable. And flexible model can require expensive Monte Carlo Process. 

The meliorate analysis  don't remove such trade off. (One direction is Mean-Field Theory [^6], but e.g. trade off is between mean-field theory  and its expansion). 

Also,  Non-parametric  methods **can be seen as transitioning smoothly between tractable and flexible model**. 

> [!PDF|red] [[📃Essays/👨🏻‍🎓Deep Learning/🧺Basic Network Structures/Generative Networks/Deep Unsupervised Learning using Noneqilibrium Thermodynamics.pdf#page=1&selection=191,0,194,51&color=red|Deep Unsupervised Learning using Noneqilibrium Thermodynamics, p.1]]
> For instance, a non-parametric Gaussian mixture model will represent a small amount of data using a single Gaussian, but may represent infinite data as a mixture of an infinite number of Gaussians

For gaussian mixture distribution, see [^13]. 

### (2) Diffusion Probabilistic Model 
The diffusion probability model allows : 
1. extreme flexibility in model structure  
2. exact sampling  
3. easy multiplication with other distributions 
4. model log likelihood and the probability of individual states can be cheaply evaluated.

The method is : 
1. Use a <b><mark style='background: transparent; color: orange'>Generative Markov chain</mark></b> to gradually convert one distribution into approximately another. (e.g. **convert the simple gaussian distribution to data distribution, this is diffusion process**) 

2. <b><mark style='background: transparent; color: orange'>Define a probabilistic model as the endpoint of the Markov chain</mark></b>. Since **each step in the diffusion chain has an analytically evaluable probability**, the **full chain** can **also be analytically evaluated**.

Also, learning in this framework involves <b><mark style='background: transparent; color: orange'>estimating small perturbations</mark></b> to a **diffusion process**, which is ==more tractable than explicitly describing the full distribution==.  

For the simple example, we can train high-log-likelihood model  for the MNIST and CIFAR 10 for data generation. 

### (3) Inspiration Knowledges  
For **training inference** and **generative  probabilistic models**, see [^7].   

Also  some basic knowledges can be found at *Physic quasi-static process*[^8][^9] and *Annealed importance sampling*[^10] (AIS) 

> [!PDF|note] [[📃Essays/👨🏻‍🎓Deep Learning/🧺Basic Network Structures/Generative Networks/Deep Unsupervised Learning using Noneqilibrium Thermodynamics.pdf#page=3&selection=134,32,136,4&color=note|Deep Unsupervised Learning using Noneqilibrium Thermodynamics, p.3]]
> >  In (Burda et al., 2014), it is shown that AIS can also be performed using the reverse rather than forward trajectory
> 
> 

We note <b><mark style='background: transparent; color: orange'>The diffusion process is firstly  proposed in</mark></b> <b><mark style='background: transparent; color: red'>Langevin dynamics</mark></b> (Langevin, 1908) 

Another very important concept is <b><mark style='background: transparent; color: orange'>Kolmogorov forward and backward equation</mark></b> (Feller, 1949).  
Kolmogorov forward and backward equations [^14] 

> [!PDF|red] [[📃Essays/👨🏻‍🎓Deep Learning/🧺Basic Network Structures/Generative Networks/Deep Unsupervised Learning using Noneqilibrium Thermodynamics.pdf#page=3&selection=144,22,148,43&color=red|Deep Unsupervised Learning using Noneqilibrium Thermodynamics, p.3]]
> > The Kolmogorov forward equation corresponds to the **Fokker-Planck equation**, while the Kolmogorov backward equation **describes the time-reversal of this diffusion process**, but **requires knowing gradients of the density function as a function of time**.
> 

For Fokker-Planck Equation (also called Kolmogorov forward equation), see [^15] and [^16], for **Kolmogorov backward equation**, see [^14]. 

Also, basic diffusion can be referred from [^18] as <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">1.2.8</span>)</span>[^18]: 
$$\Large
\boxed{\frac{ \partial \rho (x,t) }{ \partial t }  = D \cdot  \frac{ \partial^{2} \rho(x,t) }{ \partial x^{2} } } \tag{1.3.1}
$$
This is known as <b><mark style='background: transparent; color: red'>diffusion equation</mark></b>, where $D$ is **diffusivity**.  

We note from [^21], we know  the **diffusion length** is calculated as : 
$$
L_{d} = \sqrt{4 D t} \tag{1.3.2}
$$

Also we introduce the ***Peclet number*** here : 

An important example is the ratio between the system length and the diffusion length, typically calculated with the time set to the ***residence time*** (the average time gases are in the reactor). 

In order to avoid having square roots in the calculation, it is traditional to calculate the Pe : 
$$
t = \frac{L}{U}\qquad  Pe = \frac{4 L^{2}}{L_{d}^{2}} = \frac{L^{2}}{D t}  =  \frac{L U}{D} \tag{1.3.3}
$$
where $t_{res}$ is residence time in region, and $U$ is fluid velocity. 

### (4) Features  of the Diffusion model  
Also in diffusion process, its easy to multiply the distribution with another probability distribution. Which is convenient for making posterior probability.  

In [^11], <b><mark style='background: transparent; color: orange'>the inference model can  be  particularly challenging</mark></b> (For inference model and generative model, see [^12]), but here provide a solution for it. 

Diffusion model **needs the training of model with thousands of layers with  upper and lower bounds on entropy production in each layer**. 

Also *training probabilistic model* is a very common topic.  

## 2. Diffusion Algorithm
The goal is to <b><mark style='background: transparent; color: orange'>define a forward  diffusion process converting  any complex data distribution into a simple, tractable, distribution</mark></b>, and then **learn a finite-time reversal of this diffusion process** which defines our generative model distribution 
$$
\text{complex data distribution} \overset{\text{diffusion forward}}{\longrightarrow} \text{simple distribution} \overset{\text{reversal}}{\longrightarrow} \dots \tag{2.1}
$$
we learn the  reversal of the model. 

> [!PDF|note] [[📃Essays/👨🏻‍🎓Deep Learning/🧺Basic Network Structures/Generative Networks/Deep Unsupervised Learning using Noneqilibrium Thermodynamics.pdf#page=3&selection=156,41,163,58&color=note|Deep Unsupervised Learning using Noneqilibrium Thermodynamics, p.3]]
> > We first **describe the forward, inference diffusion process. We then show how the reverse, generative diffusion process can be trained and used to evaluate probabilities.** We also derive entropy bounds for the reverse process, and show how the **learned distributions can be multiplied by any second distribution**
> 
> 

### (1) Forward Trajectory 
Firstly, we introduce the simplest gaussian diffusion,  which is **defined as** : 
$$\boxed{x_{t + 1} := x_{t} + \eta_{t}\qquad  \eta_{t} \sim \mathcal{N} (0, \sigma^{2}) } \tag{2.1.1} $$
Note the above equation <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.1.1</span>)</span> is also called <b><mark style='background: transparent; color: orange'>forward process</mark></b>. 

We **label the data distribution** as $q(x^{(0)})$, then convert it to $\pi(y)$ <b><mark style='background: transparent; color: red'>by repeating application of Markov diffusion kernel</mark></b> $T_{\pi}(y|y'; \beta)$.  
$$
\boxed{
\pi(y) =  \int   T_{\pi} (y|y'; \beta) \pi (y') dy'
} \tag{2.1.2}
$$
Where $\beta$ is <b><mark style='background: transparent; color: red'>diffusion rate</mark></b>. $T_{\pi}(y|y'; \beta)$ is **Markov diffusion kernel**. 
then **data distribution is updated by following equation** :  
$$
\boxed{
q(x^{(t)}| x^{(t - 1)}) = T_{\pi} (x^{(t)}| x^{(t-1)}; \beta_{t})
} \tag{2.1.3}
$$
Then the **data distribution becomes** :  
$$
q(x^{(0, \dots  T)}) = q(x^{(0)})  \prod_{t=1}^{n} q(x^{(t)} | x^{(t-1)}) \tag{2.1.4}
$$
We note here, we often **use normal distribution  kernel function as the kernel function**, but with the $\beta_{t}$ parameter, **for $\beta_{t} = 0$, it becomes standard normal distribution**. 
$$
\pi(x^{(T)}) = \mathcal{N} (x^{(T)}; 0, I) \tag{2.1.5}
$$
in <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.1.2</span>)</span>, we here often have <b><mark style='background: transparent; color: orange'>the following diffusion settings</mark></b> : 
$$
q(x^{(t)} ; x^{(t -1 )}) = \mathcal{N} (x^{(t)}; x^{(t-1)}\sqrt{1 - \beta_{t}}, I \beta_{t}) \tag{2.1.6}
$$
note here the second parameter is $\mu$ and third is $\sigma$, then since 

### (2) Reverse Trajectory
The reverse process of the <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.1.2~3</span>)</span> is : 
$$
p(x^{(T)}) = \pi (x^{(T)}) \tag{2.2.1}
$$
$$
\boxed{
p(x^{(0\dots T)}) =  p(x^{(T)}) \prod_{t=1}^{T} p (x^{(t-1)} | x^{(t)})
} \tag{2.2.2}
$$
equation <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.2.2</span>)</span> is the reverse-diffusion equation, where : 
$$ p(x^{(0\dots T)}) = p(x^{(0)}) p(x^{(1)}) \dots  p(x^{(T)}) = \text{joint probability density} \tag{2.2.3} $$
we note in appendix, we have the **reverse-diffusion kernel** : 
$$
p(x^{(t-1)} | x^{(t)}) = \mathcal{N}(x^{(t-1)}; f_{\mu}(x^{(t)} |t), f_{\Sigma } (x^{(t)}, t)) \tag{2.2.4}
$$
where $f_{\mu}(x^{(t)} |t), f_{\Sigma } (x^{(t)}, t)$ are functions defining the  mean and covariance of the reverse Markov transition.  

<b><mark style='background: transparent; color: red'>For both gaussian and binominal diffusion</mark></b>, **Reversal of the diffusion process has the identical functional form as the forward process**. consider <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.1.3</span>)</span> is Gaussian or binominal distribution, following : 
$$
q(x^{(t-1)}| x^{(t)}) \tag{2.2.5}
$$
will also be a gaussian or binominal distribution. 

<b><mark style='background: transparent; color: red'>In train process, we only learn the mean and  covariance for a Gaussian diffusion kernel</mark></b> (or flip probability of binomial kernel).   Multi-layer perceptrons are used to define functions like $f_{\mu}$. 

> [!info] 
> The longer the trajectory, the smaller diffusion rate $\beta$ 

### (3) Model Probability 
The probability of <b><mark style='background: transparent; color: orange'>generative model assigns to data</mark></b> is : 
$$
p(x^{(0)}) = \int  p (x^{(0)}, x^{(1)}, \dots  x^{(T)}) dx^{(1)} dx^{(2)}\dots  dx^{(t)} = \int p(x^{(0 \dots  t)}) dx^{(1 \dots  t)} \tag{2.3.1}
$$
Note we **care about the edge distribution** of $x^{(0)}$, which **integrates over all the other coordinates.** 

Since the integral <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.3.1</span>)</span> is intractable, we **evaluate  the relative probability of the forward and reverse trajectories averaged over forward trajectories.** so re-write <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.3.1</span>)</span> into : 
$$
p(x^{(0)}) = \int dx^{(1\dots  T)}q(x^{(1\dots T)} | x^{(0)})  \frac{ p (x^{(0\dots  T)})}{q(x^{(1\dots \space T)} | x^{(0)})} \tag{2.3.2}
$$
we know that :
$$
q(x^{(1\dots  T)} | x^{(0)}) = \prod_{i=1}^{n} p(x^{(i + 1)} | x^{(i)}) \tag{2.3.3}
$$
and also, we can also rewrite this like <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.2.2</span>)</span>: 
$$ p(x^{(0\dots T)}) = p(x^{T}) \prod_{i=1}^{n} p(x^{(i +1)} | x^{(i)}) \tag{2.3.4} $$
So using above <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.3.3~4</span>)</span>, the above equals become : 
$$
\boxed{
p(x_{0}) = \int dx^{(1\dots T)} q(x^{(1\dots T)} |  x^{(0)})  p(x^{(T)})  \prod_{t=1}^{T} \frac{p(x^{(t-1)} | x^{(t)})}{q(x^{(1\dots \space T)} | x^{(0)})}
} \tag{2.3.5}
$$
<b><mark style='background: transparent; color: red'>For Infinitesimal</mark></b> $\beta$, <b><mark style='background: transparent; color: red'>the forward and reverse distribution over trajectories can be made identical</mark></b>. 

> [!NOTE] 
> If forward and reverse distribution are same, only  1 sample from $q(x^{(1\dots  T)}|x^{(0)})$ is needed to evaluate the  integral above. 

### (4) Training Process 
In training process,  the target is to maximize the <b><mark style='background: transparent; color: orange'>model likelihood</mark></b>. Which is  : 
$$
L = \int q (x^{(0)}) \log_{} p(x^{(0)}) dx^{(0)} \tag{2.4.1}
$$
where $p(x^{(0)})$ is calculated by <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.3.5</span>)</span> . So we got : 
$$
L = \int q(x^{(0)}) \log_{} \left[  \int dx^{(1\dots T)} q(x^{(1\dots T)} |  x^{(0)})  p(x^{(T)})  \prod_{t=1}^{T} \frac{p(x^{(t-1)} | x^{(t)})}{q(x^{(1\dots \space T)} | x^{(0)})}\right] dx^{(0)} \tag{2.4.2}
$$
Note the lower bound is provided   by **Jensen's inequality** [^17], which gives for convex function : 
$$ f \left( \sum_{i} \alpha_{i} x_{i} \right) \leq   \sum_{i} \alpha_{i} f(x_{i}) \tag{2.4.3} $$
We took following as the coefficient : 
$$ q(x^{(1\dots T)} | x^{(0)})dx^{(1\dots  T)} \tag{2.4.4} $$
also we have following from  <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.2.2</span>)</span>, <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.3.1</span>)</span>, <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.3.3</span>)</span>: 
$$
q(x^{(0)})  \int dx^{(1\dots T)} q(x^{(1\dots T)} |  x^{(0)}) = q(x^{(0\dots  T)}) \tag{2.4.5}
$$
then <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.4.1</span>)</span> has a lower bound : 
$$
\boxed{
L \geq  \int  q(x^{(0\dots T)}) \log_{} \left[  p(x^{(T)}) \prod_{t=1}^{T}  \frac{p(x^{(t-1)} | x^{(t)})}{q(x^{(t)} | x^{(t-1)})} \right]  dx^{(0\dots  T)}
} \tag{2.4.6}
$$

Also, For the diffusion process in the essay, finally, the diffusion trajectories reduces to : 
$$
K = - \sum_{t = 2}^{ T } \int dx^{(0)} dx^{(t)} q (x^{(0)}, x^{(t)}) \cdot  D_{KL} (q(x^{(t-1)} | x^{(t)} , x^{(0)}) ||  p(x^{(t -1)} | x^{(t)}))  + H_{q} (X^{(T)} | X^{(0)} ) - H_{q} (X^{(1)} | X^{(0)}) - H_{p}(X^{(T)}) \tag{2.4.7}
$$
Note that when the forward and backward process are identical, the equation <span style="cursor: default; color: #4199e1;">(<span style="text-decoration: none; cursor: pointer; color: #4199e1;">2.4.6</span>)</span> will become equal. 

The The training process includes searching for the Markov transitions to maximize the lower bound of the log likelihood. 
$$
\hat{p}(x^{(t - 1)} | x^{(t)}) = \arg \max_{p (x^{(t-1) }| x^{(t)})} K \tag{2.4.8}
$$

the <b><mark style='background: transparent; color: orange'>task of estimating a probability distribution</mark></b> has been **reduced to the task of performing regression on the functions which set the mean and covariance of a sequence of Gaussians** (or set the state flip probability for a sequence of Bernoulli trials)

Note we often choose the forward diffusion schedule $\beta_{1\dots T}$  to erase a constant fraction $\frac{1}{T}$. yield the diffusion rate as : 
$$
\beta_{t} = (T - t + 1) \tag{2.4.9}
$$

For training methods, see [^20] 


[^1]: Sohl-Dickstein, Jascha, Eric A. Weiss, Niru Maheswaranathan, and Surya Ganguli. _Deep Unsupervised Learning Using Nonequilibrium Thermodynamics_. n.d.

[^2]: Çiçek, Özgün, Ahmed Abdulkadir, Soeren S. Lienkamp, Thomas Brox, and Olaf Ronneberger. “3D U-Net: Learning Dense Volumetric Segmentation from Sparse Annotation.” arXiv:1606.06650. Preprint, arXiv, June 21, 2016. [https://doi.org/10.48550/arXiv.1606.06650](https://doi.org/10.48550/arXiv.1606.06650). 

[^3]: [Understanding 3D Diffusion Models](https://isamu-website.medium.com/understanding-3d-diffusion-models-64e1cadc0cff)

[^4]: [learnopencv.com/denoising-diffusion-probabilistic-models/](https://learnopencv.com/denoising-diffusion-probabilistic-models/)

[^5]: [lilianweng's blog](https://lilianweng.github.io/posts/2021-07-11-diffusion-models/#forward-diffusion-process)

[^6]: [[📖Basic Knowledges/➕Mathematics/📈 Diff & Variational Theory/5. Mean-Field Approximation in Variational Inference|5. Mean-Field Approximation in Variational Inference]] 

[^7]: [[📃Essays/👨🏻‍🎓Deep Learning/🧺Basic Network Structures/The wake-sleep algorithm.pdf|The wake-sleep algorithm]]

[^8]: [en.wikipedia.org/wiki/Quasistatic_process](https://en.wikipedia.org/wiki/Quasistatic_process)

[^9]: [[📖Basic Knowledges/➕Mathematics/Quasi-static process|Quasi-static process]]

[^10]: [[📃Essays/⛈️Random Process/Anneled Importance Sampling.pdf|Anneled Importance Sampling]]

[^11]: [[📃Essays/➕Mathematics Theory/Variational Bayes Inference.pdf|Variational Bayes Inference]]

[^12]: [[📖Basic Knowledges/🧑🏻‍🏫Deep Learning/2. Variational Autoencoder (VAE)#3. Variational Autoencoder|2. Variational Autoencoder (VAE)]]

[^13]: [[📖Basic Knowledges/➕Mathematics/🔮Probability Theory & Random Process/2. Gaussian Mixture Distributions|2. Gaussian Mixture Distributions]]

[^14]: [[📖Basic Knowledges/➕Mathematics/🔮Probability Theory & Random Process/6. Kolmogorov backward diffusion equation|6. Kolmogorov backward diffusion equation]]

[^15]: https://en.wikipedia.org/wiki/Fokker%E2%80%93Planck_equation

[^16]: [[📖Basic Knowledges/➕Mathematics/🔮Probability Theory & Random Process/5. Fokker-Planck equation (Kolmogorov forward equation)|5. Fokker-Planck equation (Kolmogorov forward equation)]]

[^17]: Jensen's inequality,  DeepLearning Optimization Algorithm, Deep Learning, Chapter 9  

[^18]: [[📖Basic Knowledges/➕Mathematics/🔮Probability Theory & Random Process/4. Stochastic Integration and Ito Calculus|4. Stochastic Integration and Ito Calculus]]

[^19]: [[📃Essays/👨🏻‍🎓Deep Learning/🧺Basic Network Structures/Generative Networks/Diffusion_appendix.pdf|Diffusion_appendix]]

[^20]: [[📖Basic Knowledges/🧑🏻‍🏫Deep Learning/💨Diffusion Model/8. Diffusion Model Training Method|8. Diffusion Model Training Method]]

[^21]: https://www.enigmatic-consulting.com/semiconductor_processing/CVD_Fundamentals/xprt/diffusion_length.html 

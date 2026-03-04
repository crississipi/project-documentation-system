import React from 'react'

const Login = () => {
  return (
    <div className='h-full w-full fixed flex items-center justify-center z-50 backdrop-blur-3xl overflow-hidden'>
      {/* Noise texture overlay */}
      <div className='absolute inset-0 z-0 bg-noise opacity-[0.03] pointer-events-none'></div>
      <div className='h-auto w-full max-w-xs sm:max-w-sm md:max-w-md mx-4 rounded-2xl bg-white z-10 flex flex-col items-center p-5 sm:p-6'>
        <div className='h-32 w-full border'></div>
        <form action="#" className='w-full flex flex-col items-center my-10'>
            <div className='group w-full h-max rounded-lg border border-gray-300 focus-within:border-violet-600 has-[input:not(:placeholder-shown)]:border-violet-600 py-3 px-5 relative transition-colors'>
                <input 
                  type="email" 
                  name="email" 
                  id="email" 
                  className="peer w-full h-full bg-transparent outline-none text-black placeholder-transparent" 
                  placeholder="Email Address" 
                />
                <label 
                  htmlFor="email" 
                  className="absolute left-3 -top-2.5 bg-white px-1 text-sm text-violet-600 transition-all 
                             peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 
                             peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-violet-600"
                >
                  Email Address
                </label>
            </div>
            <div className='group w-full h-max rounded-lg border border-gray-300 focus-within:border-violet-600 has-[input:not(:placeholder-shown)]:border-violet-600 py-3 px-5 relative mt-5 transition-colors'>
                <input 
                  type="password" 
                  name="password" 
                  id="password" 
                  className="peer w-full h-full bg-transparent outline-none text-black placeholder-transparent" 
                  placeholder="Password" 
                />
                <label 
                  htmlFor="password" 
                  className="absolute left-3 -top-2.5 bg-white px-1 text-sm text-violet-600 transition-all 
                             peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 
                             peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-violet-600"
                >
                  Password
                </label>
            </div>
            <button type="button" className='ml-auto mt-3 hover:text-violet-600'>Forgot Password</button>
        </form>
      </div>
    </div>
  )
}

export default Login

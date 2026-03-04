import { BiLock, BiLockOpen, BiRedo, BiSitemap, BiUndo } from 'react-icons/bi'

const Documentation = () => {
  return (
    <div className='h-full w-full flex overflow-hidden'>
      <div className='h-full w-full flex flex-col overflow-hidden py-5'>
        <div className='w-full flex items-center justify-between mb-3 px-4 sm:px-10 gap-3'>
            <div className='flex flex-col'>
                <h1 className="text-2xl font-semibold">Documentation</h1>
                <p className='text-slate-500'>Manage and view documentation of projects here.</p>
            </div>
            <div className='flex flex-wrap gap-1'>
                <button type="button" className='h-10 aspect-square rounded-full border border-slate-400 text-slate-400 flex items-center justify-center text-xl hover:bg-slate-200 focus:bg-slate-50 focus:text-black focus:border-black ease-out duration-150'>
                    <BiUndo />
                </button>
                <button type="button" className='h-10 aspect-square rounded-full border border-slate-400 text-slate-400 flex items-center justify-center text-xl hover:bg-slate-200 focus:bg-slate-50 focus:text-black focus:border-black ease-out duration-150'>
                    <BiRedo />
                </button>
                <button type="button" className='h-10 px-5 rounded-full border border-slate-400 text-slate-400 flex items-center justify-center text-sm hover:bg-slate-200 focus:bg-slate-50 focus:text-black focus:border-black ease-out duration-150'>
                    Cancel
                </button>
                <button type="button" className='h-10 px-5 rounded-full border border-slate-400 text-slate-400 flex items-center justify-center text-sm'>
                    Save Changes
                </button>
            </div>
        </div>
        <div className='w-full h-full flex gap-1 pl-4 sm:pl-10 pr-3'>
            <div className='w-full h-full flex flex-col overflow-hidden bg-white'>
                <div className='w-full flex items-center justify-between bg-white px-5 py-2'>
                    <h2 className='w-full text-xl font-semibold truncate'>Project Name</h2>
                    <span className='w-full max-w-xs flex flex-col text-right'>
                        <em>Version Control No. 12345</em>
                        <em className='text-sm text-slate-500'>Last Edited: 2 hours ago</em>
                    </span>
                </div>
                <div className='w-full h-full flex flex-col overflow-x-hidden px-5'>
                    <p className='text-slate-500 text-xs uppercase font-medium'>main {`>`} login</p>
                </div>
            </div>
            <div>
                <button type="button">
                    <BiLock />
                    <BiLockOpen />
                </button>
                <button type="button">
                    <BiSitemap />
                </button>
            </div>
        </div> 
      </div>
    </div>
  )
}

export default Documentation

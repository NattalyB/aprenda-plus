import { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export function SearchProvider({ children }) {
  const [termoBusca, setTermoBusca] = useState('');
  return (
    <SearchContext.Provider value={{ termoBusca, setTermoBusca }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
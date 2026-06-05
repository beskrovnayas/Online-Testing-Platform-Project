import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import TestsList from './pages/TestsList';
import TakeTest from './pages/CurrentTest';



function App() {
  return (
    <Router>
      <div className = "min-h-screen bg-gray-50">
        <Routes>
          {/*Главная страница*/}
          <Route 
            path="/" 
              element = {
                <div className="min-h-screen bg-gray-50">
                  
                  {/*Главная секция*/}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-24">
                    <div className="max-w-5xl mx-auto px-6 text-center">
                      <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                        Система для проведения<br/>тестов
                      </h1>
                      <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10">
                        Описание системы для проведения тестов
                      </p>
                      <a 
                        href="/tests"
                        className="inline-block bg-white text-blue-700 font-semibold px-10 py-5 rounded-2xl text-lg hover:bg-blue-50 transition-colors"
                      >
                        Перейти к тестам
                      </a>
                    </div>
                  </div>

                  {/*О системе*/}
                  <div className="max-w-5xl mx-auto px-6 py-20">
                    <div className="text-center mb-16">
                      <h2 className="text-4xl font-bold text-gray-900 mb-4">О системе</h2>
                      <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Описание системы: какая она?
                      </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-10">
                      <div className="text-center">
                        {/* <div className="text-5xl mb-4"></div> Мб какую картинку?*/} 
                        <h3 className="text-2xl font-semibold mb-3">1 действие/преимсущество</h3>
                        <p className="text-gray-600">Описание</p>
                      </div>
                      <div className="text-center">
                        {/* <div className="text-5xl mb-4"></div> Мб какую картинку?*/} 
                        <h3 className="text-2xl font-semibold mb-3">2 действие/преимсущество</h3>
                        <p className="text-gray-600">Описание</p>
                      </div>
                      <div className="text-center">
                        {/* <div className="text-5xl mb-4"></div> Мб какую картинку?*/} 
                        <h3 className="text-2xl font-semibold mb-3">3 действие/преимсущество</h3>
                        <p className="text-gray-600">Описание</p>
                      </div>
                    </div>
                  </div>

                  {/*Для кого подойдет*/}
                  <div className="bg-white py-20">
                    <div className="max-w-5xl mx-auto px-6">
                      <h2 className="text-4xl font-bold text-center mb-12">Для кого подойдёт система?</h2>
                      <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-50 p-8 rounded-3xl">
                          <h3 className="font-semibold text-xl mb-3">1 область</h3>
                          <p className="text-gray-600">Описание</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl">
                          <h3 className="font-semibold text-xl mb-3">2 область</h3>
                          <p className="text-gray-600">Описание</p>
                        </div>
                        <div className="bg-gray-50 p-8 rounded-3xl">
                          <h3 className="font-semibold text-xl mb-3">3 область</h3>
                          <p className="text-gray-600">Описание</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/*Преимущества*/}
                  <div className="max-w-5xl mx-auto px-6 py-20">
                    <h2 className="text-4xl font-bold text-center mb-12">Преимущества платформы</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="flex gap-5">
                        {/*<div className="text-4xl"></div>*/}
                        <div>
                          <h3 className="text-xl font-semibold mb-2">1 преимущество</h3>
                          <p className="text-gray-600">Описание</p>
                        </div>
                      </div>
                      <div className="flex gap-5">
                        {/*<div className="text-4xl"></div>*/}
                        <div>
                          <h3 className="text-xl font-semibold mb-2">2 преимущество</h3>
                          <p className="text-gray-600">Описание</p>
                        </div>
                      </div>
                    </div>
                  </div>

                {/*Команда*/}
                <div className="bg-gray-900 text-white py-20">
                  <div className="max-w-5xl mx-auto px-6 text-center">
                    <h2 className="text-4xl font-bold mb-4">Наша команда</h2>
                    <p className="text-gray-400 mb-12">Проект выполнен студентами в рамках учебной практики 1 курса 2 семестра</p>

                    <div className="grid md:grid-cols-2 gap-12">
                      <div>
                        <h3 className="text-2xl font-semibold mb-6">Команда "☆"</h3>
                        <div className="space-y-4 text-left max-w-sm mx-auto">
                          <p>- 2 фронтенд-разработчика</p>
                          <p>- 2 бэкенд-разработчика</p>
                        <p>- 1 специалист по БД</p>
                      </div>
                    </div>

                      <div>
                        <h3 className="text-2xl font-semibold mb-6">Ментор проекта</h3>
                        <p className="text-xl">Н</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Подвал */}
                <footer className="bg-gray-100 py-8 text-center text-gray-500 text-sm">
                <p>{new Date().getFullYear()} СПбГУ МКН СП 1 курс</p>                  </footer>
              </div>
            }
          />

          {/* страница со списком тестов */}
          <Route 
            path = "/tests"
            element = {<TestsList />}
          />

          {/* страница конкретного теста */}
          <Route 
            path = "/tests/:id"
            element = {<TakeTest />}
          />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
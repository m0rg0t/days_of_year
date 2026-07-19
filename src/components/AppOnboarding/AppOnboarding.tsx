import {
  Button,
  ModalPage,
  ModalPageHeader,
  PanelHeaderButton,
} from '@vkontakte/vkui';

import './AppOnboarding.css';

interface AppOnboardingProps {
  id: string;
  onComplete: () => void;
}

const FEATURES = [
  {
    icon: '●',
    title: 'Увидьте год целиком',
    text: 'Каждая точка — один день: прожитые дни заполнены, сегодняшний выделен.',
  },
  {
    icon: '♥',
    title: 'Сохраните настроение',
    text: 'Выберите цвет и добавьте одно важное слово к сегодняшнему или прошедшему дню.',
  },
  {
    icon: '↗',
    title: 'Следите за прогрессом',
    text: 'Смотрите серии и достижения, возвращайтесь к прошлым годам и делитесь результатом.',
  },
] as const;

export function AppOnboarding({ id, onComplete }: AppOnboardingProps) {
  return (
    <ModalPage
      id={id}
      onClose={onComplete}
      dynamicContentHeight
      size="m"
      hideCloseButton
      modalContentTestId="onboarding"
      header={(
        <ModalPageHeader
          after={(
            <PanelHeaderButton onClick={onComplete} aria-label="Закрыть онбординг">
              Закрыть
            </PanelHeaderButton>
          )}
        >
          Добро пожаловать
        </ModalPageHeader>
      )}
    >
      <div className="onboarding">
        <div className="onboarding__visual" aria-hidden>
          <div className="onboarding__dots">
            <span />
            <span />
            <span className="onboarding__dot--today" />
            <span className="onboarding__dot--future" />
            <span className="onboarding__dot--future" />
          </div>
        </div>

        <div className="onboarding__intro">
          <h2>Весь год перед глазами</h2>
          <p>«Дни года» помогают замечать каждый день и собирать личную историю года.</p>
        </div>

        <div className="onboarding__features">
          {FEATURES.map((feature) => (
            <div className="onboarding__feature" key={feature.title}>
              <span className="onboarding__feature-icon" aria-hidden>{feature.icon}</span>
              <div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="onboarding__actions">
          <Button
            size="l"
            stretched
            onClick={onComplete}
          >
            Начать отмечать дни
          </Button>
        </div>
      </div>
    </ModalPage>
  );
}
